import { useState } from 'react';
import { Truck, Plus, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getTotalBoxes, getDispatchedBoxes, getAvailableBoxes } from '../store/calculations';
import { uid, now, today, formatDate, formatNum, clone } from '../utils/helpers';
import type { DispatchEntry, Size } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

export default function DispatchEntryPage() {
  const { data, saveDispatchEntry, deleteDispatchEntry, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<{ lotId: string; date: string; party: string; invoiceNo: string; dispatchBoxes: { packId: string; size: Size; boxes: number }[]; type: 'Partial' | 'Full'; notes: string }>({
    lotId: '', date: today(), party: '', invoiceNo: '', dispatchBoxes: [], type: 'Partial', notes: '',
  });

  const openCreate = (lotId?: string) => {
    setEditId(null);
    const firstLot = lotId ?? data.lots[0]?.id ?? '';
    setForm({ lotId: firstLot, date: today(), party: '', invoiceNo: '', dispatchBoxes: [], type: 'Partial', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: DispatchEntry) => {
    setEditId(entry.id);
    setForm({ lotId: entry.lotId, date: entry.date, party: entry.party, invoiceNo: entry.invoiceNo, dispatchBoxes: clone(entry.dispatchBoxes), type: entry.type, notes: entry.notes ?? '' });
    setModalOpen(true);
  };

  const onLotChange = (lotId: string) => {
    setForm((f) => ({ ...f, lotId, dispatchBoxes: [] }));
  };

  const setDispatchBoxCount = (packId: string, size: Size, boxes: number) => {
    setForm((f) => {
      const existing = f.dispatchBoxes.find((d) => d.packId === packId && d.size === size);
      if (existing) {
        return { ...f, dispatchBoxes: f.dispatchBoxes.map((d) => d.packId === packId && d.size === size ? { ...d, boxes } : d) };
      }
      return { ...f, dispatchBoxes: [...f.dispatchBoxes, { packId, size, boxes }] };
    });
  };

  const getAvailableForPack = (lotId: string, packId: string, size: Size): number => {
    const packing = data.packings.find((p) => p.id === packId);
    if (!packing) return 0;
    const box = packing.boxes.find((b) => b.size === size);
    if (!box) return 0;
    const totalBoxCount = box.boxes;
    const dispatched = data.dispatches
      .filter((d) => d.lotId === lotId && d.id !== editId)
      .reduce((acc, d) => acc + d.dispatchBoxes.filter((db) => db.packId === packId && db.size === size).reduce((a, b) => a + b.boxes, 0), 0);
    const editingThis = editId ? (data.dispatches.find((d) => d.id === editId)?.dispatchBoxes.find((db) => db.packId === packId && db.size === size)?.boxes ?? 0) : 0;
    return totalBoxCount - dispatched + editingThis;
  };

  const save = async () => {
    if (!form.lotId) { alert('Select a lot'); return; }
    const lot = data.lots.find((l) => l.id === form.lotId);
    if (!lot) return;
    const validBoxes = form.dispatchBoxes.filter((d) => d.boxes > 0);
    if (validBoxes.length === 0) { alert('Enter at least one box to dispatch'); return; }

    for (const db of validBoxes) {
      const available = getAvailableForPack(form.lotId, db.packId, db.size);
      if (db.boxes > available) {
        if (!confirm(`Size ${db.size}: only ${formatNum(available)} boxes available. Continue?`)) return;
      }
    }

    const totalDispatched = validBoxes.reduce((a, b) => a + b.boxes, 0);
    const totalAvailable = getAvailableBoxes(data, form.lotId);
    const type: 'Partial' | 'Full' = totalDispatched >= totalAvailable ? 'Full' : 'Partial';

    if (editId) {
      const existing = data.dispatches.find((d) => d.id === editId)!;
      await saveDispatchEntry({ ...existing, lotId: form.lotId, date: form.date, party: form.party, invoiceNo: form.invoiceNo, dispatchBoxes: validBoxes, type, notes: form.notes });
      addHistory('Dispatch', 'Edit', `Updated dispatch for lot ${lot.lotNo}: ${totalDispatched} boxes`);
    } else {
      const entry: DispatchEntry = { id: uid('dsp_'), lotId: form.lotId, date: form.date, party: form.party, invoiceNo: form.invoiceNo, dispatchBoxes: validBoxes, type, notes: form.notes, createdAt: now() };
      await saveDispatchEntry(entry);
      addHistory('Dispatch', 'Create', `Dispatch for lot ${lot.lotNo}: ${totalDispatched} boxes (${type})`);
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const entry = data.dispatches.find((d) => d.id === deleteId);
    const lot = data.lots.find((l) => l.id === entry?.lotId);
    await deleteDispatchEntry(deleteId);
    addHistory('Dispatch', 'Delete', `Deleted dispatch for lot ${lot?.lotNo}`);
    setDeleteId(null);
  };

  const lotsWithPacking = data.lots.filter((l) => getTotalBoxes(data, l.id) > 0);
  const selectedLot = data.lots.find((l) => l.id === form.lotId);
  const lotPackings = selectedLot ? data.packings.filter((p) => p.lotId === selectedLot.id) : [];

  return (
    <div>
      <PageHeader title="Dispatch Entry" subtitle="Partial and full dispatch with box tracking" icon={<Truck size={22} />}
        action={lotsWithPacking.length > 0 ? { label: 'Add Dispatch', onClick: () => openCreate() } : undefined} />

      {lotsWithPacking.length === 0 ? (
        <EmptyState icon={<Truck size={40} />} title="No packed boxes" message="Dispatch requires packed boxes. Add packing entries first." />
      ) : data.dispatches.length === 0 ? (
        <EmptyState icon={<Truck size={40} />} title="No dispatches yet" message="Record partial or full dispatches against packed boxes."
          action={<button className="btn-primary" onClick={() => openCreate()}><Plus size={18} /> Add Dispatch</button>} />
      ) : (
        <div className="space-y-4">
          {data.lots.map((lot) => {
            const entries = data.dispatches.filter((d) => d.lotId === lot.id);
            if (entries.length === 0) return null;
            const totalBoxes = getTotalBoxes(data, lot.id);
            const dispatchedBoxes = getDispatchedBoxes(data, lot.id);
            const remainingBoxes = totalBoxes - dispatchedBoxes;
            return (
              <div key={lot.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{lot.lotNo}</h3>
                  <div className="flex gap-3 text-sm">
                    <span className="text-slate-500">Total: <strong className="text-slate-800">{formatNum(totalBoxes)}</strong></span>
                    <span className="text-slate-500">Dispatched: <strong className="text-brand-700">{formatNum(dispatchedBoxes)}</strong></span>
                    <span className="text-slate-500">Remaining: <strong className={remainingBoxes > 0 ? 'text-warn-600' : 'text-accent-600'}>{formatNum(remainingBoxes)}</strong></span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Date</th>
                        <th className="th">Party</th>
                        <th className="th">Invoice</th>
                        <th className="th">Type</th>
                        <th className="th">Boxes</th>
                        <th className="th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((entry) => {
                        const boxCount = entry.dispatchBoxes.reduce((a, b) => a + b.boxes, 0);
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="td">{formatDate(entry.date)}</td>
                            <td className="td">{entry.party || '—'}</td>
                            <td className="td">{entry.invoiceNo || '—'}</td>
                            <td className="td">
                              <span className={`badge ${entry.type === 'Full' ? 'bg-accent-100 text-accent-700' : 'bg-warn-100 text-warn-700'}`}>{entry.type}</span>
                            </td>
                            <td className="td">
                              <div className="flex flex-wrap gap-1">
                                {entry.dispatchBoxes.map((db, i) => (
                                  <span key={i} className="badge bg-slate-100 text-slate-700">{db.size}: {db.boxes}</span>
                                ))}
                                <span className="badge bg-brand-50 text-brand-700">Total: {formatNum(boxCount)}</span>
                              </div>
                            </td>
                            <td className="td text-right">
                              <div className="flex justify-end gap-1">
                                <button className="btn-ghost" onClick={() => openEdit(entry)}><Edit2 size={16} /></button>
                                <button className="btn-ghost text-err-600" onClick={() => setDeleteId(entry.id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Dispatch Entry' : 'Add Dispatch Entry'} size="xl"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Lot</label>
              <select className="input" value={form.lotId} onChange={(e) => onLotChange(e.target.value)} disabled={!!editId}>
                <option value="">Select lot</option>
                {lotsWithPacking.map((l) => <option key={l.id} value={l.id}>{l.lotNo}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Party / Buyer</label>
              <input className="input" value={form.party} onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))} placeholder="Buyer name" />
            </div>
            <div>
              <label className="label">Invoice No</label>
              <input className="input" value={form.invoiceNo} onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))} />
            </div>
          </div>

          {selectedLot && lotPackings.length > 0 && (
            <div>
              <label className="label">Select Boxes to Dispatch</label>
              <div className="space-y-3">
                {lotPackings.map((packing) => (
                  <div key={packing.id} className="p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-700">Packing: {formatDate(packing.date)}</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {packing.boxes.filter((b) => b.boxes > 0).map((box) => {
                        const available = getAvailableForPack(selectedLot.id, packing.id, box.size);
                        const currentVal = form.dispatchBoxes.find((d) => d.packId === packing.id && d.size === box.size)?.boxes ?? 0;
                        return (
                          <div key={box.size} className={`p-3 rounded-lg border-2 ${currentVal > 0 ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                            <p className="text-sm font-medium text-slate-700 mb-1">Size {box.size}</p>
                            <p className="text-xs text-slate-400 mb-2">Available: {formatNum(available)} / {formatNum(box.boxes)} boxes</p>
                            <input type="number" className="input" placeholder="Boxes to dispatch" value={currentVal || ''} onChange={(e) => setDispatchBoxCount(packing.id, box.size, +e.target.value)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Dispatch Entry?" message="This will remove the dispatch record and restore boxes to available inventory."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
