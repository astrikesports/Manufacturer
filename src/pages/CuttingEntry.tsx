import { useState } from 'react';
import { Scissors, Plus, Edit2, Trash2, History } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { emptyColorSizeQty, totalColorSizeQty } from '../store/calculations';
import { uid, now, today, formatDate, formatNum, clone } from '../utils/helpers';
import type { CuttingEntry, ColorSizeQty, Size } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

export default function CuttingEntryPage() {
  const { data, saveCuttingEntry, deleteCuttingEntry, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [form, setForm] = useState<{ lotId: string; date: string; colorSizes: ColorSizeQty[]; fabricUsed: number; notes: string }>({
    lotId: '', date: today(), colorSizes: [], fabricUsed: 0, notes: '',
  });

  const openCreate = (lotId?: string) => {
    setEditId(null);
    const firstLot = lotId ?? data.lots[0]?.id ?? '';
    const lot = data.lots.find((l) => l.id === firstLot);
    setForm({ lotId: firstLot, date: today(), colorSizes: lot ? emptyColorSizeQty(lot.colorIds, lot.sizes) : [], fabricUsed: 0, notes: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: CuttingEntry) => {
    setEditId(entry.id);
    setForm({ lotId: entry.lotId, date: entry.date, colorSizes: clone(entry.colorSizes), fabricUsed: entry.fabricUsed, notes: entry.notes ?? '' });
    setModalOpen(true);
  };

  const onLotChange = (lotId: string) => {
    const lot = data.lots.find((l) => l.id === lotId);
    setForm((f) => ({ ...f, lotId, colorSizes: lot ? emptyColorSizeQty(lot.colorIds, lot.sizes) : [] }));
  };

  const setQty = (colorId: string, size: Size, qty: number) => {
    setForm((f) => ({
      ...f,
      colorSizes: f.colorSizes.map((cs) => cs.colorId === colorId
        ? { ...cs, sizes: cs.sizes.map((s) => s.size === size ? { ...s, qty: Math.max(0, qty) } : s) }
        : cs),
    }));
  };

  const save = async () => {
    if (!form.lotId) { alert('Select a lot'); return; }
    const lot = data.lots.find((l) => l.id === form.lotId);
    if (!lot) return;
    const totalCut = totalColorSizeQty(form.colorSizes);
    if (totalCut === 0 && !editId) { alert('Enter at least some cutting quantity'); return; }

    if (editId) {
      const existing = data.cuttings.find((c) => c.id === editId)!;
      await saveCuttingEntry({ ...existing, lotId: form.lotId, date: form.date, colorSizes: form.colorSizes, fabricUsed: form.fabricUsed, notes: form.notes });
      addHistory('Cutting Entry', 'Edit', `Updated cutting for lot ${lot.lotNo}`);
    } else {
      const entry: CuttingEntry = { id: uid('cut_'), lotId: form.lotId, date: form.date, colorSizes: form.colorSizes, fabricUsed: form.fabricUsed, notes: form.notes, createdAt: now() };
      await saveCuttingEntry(entry);
      addHistory('Cutting Entry', 'Create', `Cutting entry for lot ${lot.lotNo}: ${totalCut} pcs (planned: ${lot.plannedProduction})`);
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const entry = data.cuttings.find((c) => c.id === deleteId);
    const lot = data.lots.find((l) => l.id === entry?.lotId);
    await deleteCuttingEntry(deleteId);
    addHistory('Cutting Entry', 'Delete', `Deleted cutting for lot ${lot?.lotNo}`);
    setDeleteId(null);
  };

  const colorName = (fabricId: string, colorId: string) =>
    data.fabrics.find((f) => f.id === fabricId)?.colors.find((c) => c.id === colorId)?.name ?? '—';

  const selectedLot = data.lots.find((l) => l.id === form.lotId);
  const selectedArticle = selectedLot ? data.articles.find((a) => a.id === selectedLot.articleId) : undefined;
  const colorCount = selectedLot?.colorIds.length ?? 1;

  // Planned PCS per color per size = total planned / number of colors
  const plannedPerColorSize = (size: Size): number => {
    const total = selectedLot?.sizePlans?.find((sp) => sp.size === size)?.plannedPcs ?? 0;
    return Math.round(total / Math.max(1, colorCount));
  };

  // Actual PCS for a specific color+size from current form
  const actualForColorSize = (colorId: string, size: Size): number =>
    form.colorSizes.find((cs) => cs.colorId === colorId)?.sizes.find((s) => s.size === size)?.qty ?? 0;

  // Grand total planned across all sizes (total for the lot)
  const grandTotalPlanned = selectedLot?.sizePlans?.reduce((a, sp) => a + sp.plannedPcs, 0) ?? 0;
  const grandTotalActual = totalColorSizeQty(form.colorSizes);
  const grandTotalDiff = grandTotalActual - grandTotalPlanned;
  const grandTotalShortage = Math.max(0, -grandTotalDiff);
  const grandTotalExcess = Math.max(0, grandTotalDiff);

  return (
    <div>
      <PageHeader
        title="Cutting Entry"
        subtitle="Record actual cutting against planned — tracks shortage and excess per color and size"
        icon={<Scissors size={22} />}
        action={{ label: 'Add Cutting', onClick: () => openCreate() }}
      />

      {data.lots.length === 0 ? (
        <EmptyState icon={<Scissors size={40} />} title="No lots available" message="Create a lot first before entering cutting data." />
      ) : data.cuttings.length === 0 ? (
        <EmptyState
          icon={<Scissors size={40} />}
          title="No cutting entries"
          message="Start recording cutting quantities against your lots."
          action={<button className="btn-primary" onClick={() => openCreate()}><Plus size={18} /> Add Cutting</button>}
        />
      ) : (
        <div className="space-y-4">
          {data.lots.map((lot) => {
            const entries = data.cuttings.filter((c) => c.lotId === lot.id);
            if (entries.length === 0) return null;
            const totalCutForLot = entries.reduce((a, e) => a + totalColorSizeQty(e.colorSizes), 0);
            const lotShortage = Math.max(0, lot.plannedProduction - totalCutForLot);
            const lotExcess = Math.max(0, totalCutForLot - lot.plannedProduction);
            return (
              <div key={lot.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{lot.lotNo}</h3>
                    <p className="text-xs text-slate-500">Planned: {formatNum(lot.plannedProduction)} pcs · {entries.length} entr{entries.length > 1 ? 'ies' : 'y'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Cut: <strong className="text-slate-700">{formatNum(totalCutForLot)}</strong></span>
                    {lotShortage > 0 && <span className="badge bg-err-100 text-err-700">Short: {formatNum(lotShortage)}</span>}
                    {lotExcess > 0 && <span className="badge bg-amber-100 text-amber-700">Excess: {formatNum(lotExcess)}</span>}
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Date</th>
                        <th className="th">Color / Size Breakdown</th>
                        <th className="th text-right">Total PCS</th>
                        <th className="th text-right">Fabric Used</th>
                        <th className="th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="td">{formatDate(entry.date)}</td>
                          <td className="td">
                            <div className="flex flex-wrap gap-1">
                              {entry.colorSizes.map((cs) => (
                                <span key={cs.colorId} className="badge bg-brand-50 text-brand-700">
                                  {colorName(lot.fabricId, cs.colorId)}: {cs.sizes.filter((s) => s.qty > 0).map((s) => `${s.size}=${s.qty}`).join(', ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="td text-right font-medium">{formatNum(totalColorSizeQty(entry.colorSizes))}</td>
                          <td className="td text-right">{formatNum(entry.fabricUsed, 2)}</td>
                          <td className="td text-right">
                            <div className="flex justify-end gap-1">
                              <button className="btn-ghost" onClick={() => openEdit(entry)}><Edit2 size={16} /></button>
                              <button className="btn-ghost text-err-600" onClick={() => setDeleteId(entry.id)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Cutting Entry' : 'Add Cutting Entry'}
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Header row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Lot</label>
              <select className="input" value={form.lotId} onChange={(e) => onLotChange(e.target.value)} disabled={!!editId}>
                <option value="">Select lot</option>
                {data.lots.map((l) => <option key={l.id} value={l.id}>{l.lotNo}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fabric Used ({selectedLot ? data.fabrics.find((f) => f.id === selectedLot.fabricId)?.unit : ''})</label>
              <input type="number" step="0.01" className="input" value={form.fabricUsed || ''} onChange={(e) => setForm((f) => ({ ...f, fabricUsed: +e.target.value }))} />
            </div>
          </div>

          {/* Lot info banner */}
          {selectedLot && (
            <div className="p-3 rounded-lg bg-brand-50 border border-brand-100 text-sm flex flex-wrap gap-4">
              <span className="text-brand-700">Lot: <strong>{selectedLot.lotNo}</strong></span>
              <span className="text-brand-700">Article: <strong>{selectedArticle?.code} — {selectedArticle?.name}</strong></span>
              <span className="text-brand-700">Total Planned: <strong>{formatNum(selectedLot.plannedProduction)} pcs</strong></span>
              <span className="text-brand-700">Colors: <strong>{selectedLot.colorIds.length}</strong></span>
              <span className="text-brand-700">Sizes: <strong>{selectedLot.sizes.join(', ')}</strong></span>
            </div>
          )}

          {/* Per-color tables */}
          {selectedLot && form.colorSizes.map((cs) => {
            const colorLabel = colorName(selectedLot.fabricId, cs.colorId);
            const colorTotalPlanned = selectedLot.sizes.reduce((a, s) => a + plannedPerColorSize(s), 0);
            const colorTotalActual = cs.sizes.reduce((a, s) => a + s.qty, 0);
            const colorTotalDiff = colorTotalActual - colorTotalPlanned;
            const colorTotalShortage = Math.max(0, -colorTotalDiff);
            const colorTotalExcess = Math.max(0, colorTotalDiff);

            return (
              <div key={cs.colorId} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Color header */}
                <div className="px-4 py-2 bg-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-white text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-400 inline-block" />
                    {colorLabel}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-300">Planned: <strong className="text-white">{formatNum(colorTotalPlanned)}</strong></span>
                    <span className="text-slate-300">Actual: <strong className="text-white">{formatNum(colorTotalActual)}</strong></span>
                    {colorTotalShortage > 0 && <span className="bg-err-500 text-white px-2 py-0.5 rounded-full font-medium">Short {formatNum(colorTotalShortage)}</span>}
                    {colorTotalExcess > 0 && <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">Excess {formatNum(colorTotalExcess)}</span>}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs">
                      <th className="th">Size</th>
                      <th className="th text-right">Planned PCS</th>
                      <th className="th text-center">Actual PCS</th>
                      <th className="th text-right">Difference</th>
                      <th className="th text-right">Shortage</th>
                      <th className="th text-right">Excess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cs.sizes.map((s) => {
                      const planned = plannedPerColorSize(s.size);
                      const actual = s.qty;
                      const diff = actual - planned;
                      const shortage = Math.max(0, -diff);
                      const excess = Math.max(0, diff);
                      return (
                        <tr key={s.size} className="hover:bg-slate-50">
                          <td className="td font-semibold text-slate-700 w-16">{s.size}</td>
                          <td className="td text-right text-slate-500">{formatNum(planned)}</td>
                          <td className="td p-1 w-28">
                            <input
                              type="number"
                              min="0"
                              className="input text-center"
                              value={s.qty || ''}
                              placeholder="0"
                              onChange={(e) => setQty(cs.colorId, s.size, +e.target.value)}
                            />
                          </td>
                          <td className={`td text-right font-semibold text-sm ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-accent-600' : 'text-err-600'}`}>
                            {diff === 0 ? '—' : diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}
                          </td>
                          <td className="td text-right">
                            {shortage > 0 ? <span className="badge bg-err-100 text-err-700 text-xs">{formatNum(shortage)}</span> : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="td text-right">
                            {excess > 0 ? <span className="badge bg-amber-100 text-amber-700 text-xs">{formatNum(excess)}</span> : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-sm">
                    <tr>
                      <td className="td text-slate-700">Total</td>
                      <td className="td text-right text-slate-600">{formatNum(colorTotalPlanned)}</td>
                      <td className="td text-center text-slate-800">{formatNum(colorTotalActual)}</td>
                      <td className={`td text-right ${colorTotalDiff === 0 ? 'text-slate-400' : colorTotalDiff > 0 ? 'text-accent-600' : 'text-err-600'}`}>
                        {colorTotalDiff === 0 ? '—' : colorTotalDiff > 0 ? `+${formatNum(colorTotalDiff)}` : formatNum(colorTotalDiff)}
                      </td>
                      <td className="td text-right">
                        {colorTotalShortage > 0 ? <span className="badge bg-err-100 text-err-700">{formatNum(colorTotalShortage)}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="td text-right">
                        {colorTotalExcess > 0 ? <span className="badge bg-amber-100 text-amber-700">{formatNum(colorTotalExcess)}</span> : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          {/* Grand Total */}
          {selectedLot && form.colorSizes.length > 1 && (
            <div className="border-2 border-slate-300 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-slate-700">
                <span className="font-bold text-white text-sm">Grand Total (All Colors)</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs">
                    <th className="th">Size</th>
                    <th className="th text-right">Total Planned</th>
                    <th className="th text-right">Total Actual</th>
                    <th className="th text-right">Difference</th>
                    <th className="th text-right">Shortage</th>
                    <th className="th text-right">Excess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedLot.sizes.map((size) => {
                    const planned = selectedLot.sizePlans?.find((sp) => sp.size === size)?.plannedPcs ?? 0;
                    const actual = form.colorSizes.reduce((a, cs) => a + (cs.sizes.find((s) => s.size === size)?.qty ?? 0), 0);
                    const diff = actual - planned;
                    const shortage = Math.max(0, -diff);
                    const excess = Math.max(0, diff);
                    return (
                      <tr key={size} className="hover:bg-slate-50">
                        <td className="td font-semibold text-slate-700">{size}</td>
                        <td className="td text-right text-slate-500">{formatNum(planned)}</td>
                        <td className="td text-right font-medium text-slate-800">{formatNum(actual)}</td>
                        <td className={`td text-right font-semibold ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-accent-600' : 'text-err-600'}`}>
                          {diff === 0 ? '—' : diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}
                        </td>
                        <td className="td text-right">
                          {shortage > 0 ? <span className="badge bg-err-100 text-err-700 text-xs">{formatNum(shortage)}</span> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="td text-right">
                          {excess > 0 ? <span className="badge bg-amber-100 text-amber-700 text-xs">{formatNum(excess)}</span> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-sm">
                  <tr>
                    <td className="td text-slate-800">Grand Total</td>
                    <td className="td text-right text-slate-700">{formatNum(grandTotalPlanned)}</td>
                    <td className="td text-right text-slate-900">{formatNum(grandTotalActual)}</td>
                    <td className={`td text-right text-base ${grandTotalDiff === 0 ? 'text-slate-400' : grandTotalDiff > 0 ? 'text-accent-600' : 'text-err-600'}`}>
                      {grandTotalDiff === 0 ? '—' : grandTotalDiff > 0 ? `+${formatNum(grandTotalDiff)}` : formatNum(grandTotalDiff)}
                    </td>
                    <td className="td text-right">
                      {grandTotalShortage > 0 ? <span className="badge bg-err-100 text-err-700">{formatNum(grandTotalShortage)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td text-right">
                      {grandTotalExcess > 0 ? <span className="badge bg-amber-100 text-amber-700">{formatNum(grandTotalExcess)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Cutting Entry?"
        message="This will permanently delete this cutting entry."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Cutting History" size="md">
        <div className="space-y-2">
          {data.history.filter((h) => h.module === 'Cutting Entry').slice(0, 20).map((h) => (
            <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
              <span className={`badge ${h.action === 'Create' ? 'bg-accent-100 text-accent-700' : h.action === 'Edit' ? 'bg-brand-100 text-brand-700' : 'bg-err-100 text-err-700'}`}>{h.action}</span>
              <div className="flex-1"><p className="text-sm text-slate-700">{h.description}</p><p className="text-xs text-slate-400">{formatDate(h.timestamp)}</p></div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
