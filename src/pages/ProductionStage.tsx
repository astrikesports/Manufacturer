import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import {
  getLotColorSizeCut, getLotColorSizeStitch, getLotColorSizeFinish, getLotColorSizePress,
  emptyColorSizeQty, colorSizeToMap, totalColorSizeQty,
} from '../store/calculations';
import { uid, now, today, formatDate, formatNum, clone } from '../utils/helpers';
// stitching entries use text PKs so uid() is still valid for them
import type { ColorSizeQty, Size, StitchingEntry, FinishingEntry, PressingEntry } from '../types';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

type StageType = 'stitching' | 'finishing' | 'pressing';

interface Props {
  stage: StageType;
}

export default function ProductionStage({ stage }: Props) {
  const { data, saveStitchingEntry, deleteStitchingEntry, saveFinishingEntry, deleteFinishingEntry, savePressingEntry, deletePressingEntry, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isStitching = stage === 'stitching';
  const isFinishing = stage === 'finishing';
  const entries = isStitching ? data.stitchings : isFinishing ? data.finishings : data.pressings;
  const upstreamMap = isStitching ? getLotColorSizeCut : isFinishing ? getLotColorSizeStitch : getLotColorSizeFinish;
  const currentMap = isStitching ? getLotColorSizeStitch : isFinishing ? getLotColorSizeFinish : getLotColorSizePress;
  const moduleLabel = isStitching ? 'Stitching' : isFinishing ? 'Finishing' : 'Pressing';
  const upstreamLabel = isStitching ? 'Cutting' : isFinishing ? 'Stitching' : 'Finishing';

  const [form, setForm] = useState<{ lotId: string; date: string; colorSizes: ColorSizeQty[]; notes: string }>({
    lotId: '', date: today(), colorSizes: [], notes: '',
  });

  const openCreate = (lotId?: string) => {
    setEditId(null);
    const firstLot = lotId ?? data.lots[0]?.id ?? '';
    const lot = data.lots.find((l) => l.id === firstLot);
    setForm({ lotId: firstLot, date: today(), colorSizes: lot ? emptyColorSizeQty(lot.colorIds, lot.sizes) : [], notes: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: StitchingEntry | FinishingEntry | PressingEntry) => {
    setEditId(entry.id);
    setForm({ lotId: entry.lotId, date: entry.date, colorSizes: clone(entry.colorSizes), notes: entry.notes ?? '' });
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

    const upstream = upstreamMap(data, form.lotId);
    const formMap = colorSizeToMap(form.colorSizes);
    for (const [colorId, sizeMap] of formMap) {
      for (const [size, qty] of sizeMap) {
        const available = upstream.get(colorId)?.get(size) ?? 0;
        const alreadyReceived = currentMap(data, form.lotId).get(colorId)?.get(size) ?? 0;
        const editingThis = editId ? (entries.find((e) => e.id === editId)?.colorSizes.find((cs) => cs.colorId === colorId)?.sizes.find((s) => s.size === size)?.qty ?? 0) : 0;
        const maxAllowed = available - alreadyReceived + editingThis;
        if (qty > maxAllowed) {
          if (!confirm(`${colorName(lot.fabricId, colorId)} ${size}: ${formatNum(qty)} entered, but only ${formatNum(maxAllowed)} available from ${upstreamLabel}. This is Excess — continue?`)) return;
        }
      }
    }

    if (isStitching) {
      if (editId) {
        const existing = data.stitchings.find((e) => e.id === editId)!;
        await saveStitchingEntry({ ...existing, lotId: form.lotId, date: form.date, colorSizes: form.colorSizes, notes: form.notes });
        addHistory(moduleLabel, 'Edit', `Updated ${moduleLabel.toLowerCase()} for lot ${lot.lotNo}`);
      } else {
        const entry: StitchingEntry = { id: uid('stch_'), lotId: form.lotId, cuttingId: '', date: form.date, colorSizes: form.colorSizes, notes: form.notes, createdAt: now() };
        await saveStitchingEntry(entry);
        addHistory(moduleLabel, 'Create', `${moduleLabel} entry for lot ${lot.lotNo}: ${totalColorSizeQty(form.colorSizes)} pcs`);
      }
    } else if (isFinishing) {
      if (editId) {
        const existing = data.finishings.find((e) => e.id === editId)!;
        await saveFinishingEntry({ ...existing, lotId: form.lotId, date: form.date, colorSizes: form.colorSizes, notes: form.notes });
        addHistory(moduleLabel, 'Edit', `Updated ${moduleLabel.toLowerCase()} for lot ${lot.lotNo}`);
      } else {
        const entry: FinishingEntry = { id: '', lotId: form.lotId, cuttingId: '', date: form.date, colorSizes: form.colorSizes, notes: form.notes, createdAt: now() };
        await saveFinishingEntry(entry);
        addHistory(moduleLabel, 'Create', `${moduleLabel} entry for lot ${lot.lotNo}: ${totalColorSizeQty(form.colorSizes)} pcs`);
      }
    } else {
      if (editId) {
        const existing = data.pressings.find((e) => e.id === editId)!;
        await savePressingEntry({ ...existing, lotId: form.lotId, date: form.date, colorSizes: form.colorSizes, notes: form.notes });
        addHistory(moduleLabel, 'Edit', `Updated ${moduleLabel.toLowerCase()} for lot ${lot.lotNo}`);
      } else {
        const entry: PressingEntry = { id: '', lotId: form.lotId, finishingId: '', date: form.date, colorSizes: form.colorSizes, notes: form.notes, createdAt: now() };
        await savePressingEntry(entry);
        addHistory(moduleLabel, 'Create', `${moduleLabel} entry for lot ${lot.lotNo}: ${totalColorSizeQty(form.colorSizes)} pcs`);
      }
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const entry = entries.find((e) => e.id === deleteId);
    const lot = data.lots.find((l) => l.id === entry?.lotId);
    if (isStitching) {
      await deleteStitchingEntry(deleteId);
    } else if (isFinishing) {
      await deleteFinishingEntry(deleteId);
    } else {
      await deletePressingEntry(deleteId);
    }
    addHistory(moduleLabel, 'Delete', `Deleted ${moduleLabel.toLowerCase()} for lot ${lot?.lotNo}`);
    setDeleteId(null);
  };

  const colorName = (fabricId: string, colorId: string) => data.fabrics.find((f) => f.id === fabricId)?.colors.find((c) => c.id === colorId)?.name ?? '—';

  const selectedLot = data.lots.find((l) => l.id === form.lotId);
  const upstreamData = selectedLot ? upstreamMap(data, selectedLot.id) : new Map();
  const currentData = selectedLot ? currentMap(data, selectedLot.id) : new Map();

  const lotsWithUpstream = data.lots.filter((l) => {
    const up = upstreamMap(data, l.id);
    let total = 0;
    for (const [, sm] of up) for (const [, q] of sm) total += q;
    return total > 0;
  });

  const upstreamTotalForLot = (() => {
    if (!selectedLot) return 0;
    let t = 0;
    for (const [, sm] of upstreamData) for (const [, q] of sm) t += q;
    return t;
  })();

  const totalFormActual = totalColorSizeQty(form.colorSizes);
  const totalAlreadyReceived = (() => {
    if (!selectedLot) return 0;
    let t = 0;
    for (const [, sm] of currentData) for (const [, q] of sm) t += q;
    if (editId) {
      const editEntry = entries.find((e) => e.id === editId);
      if (editEntry) return t - totalColorSizeQty(editEntry.colorSizes);
    }
    return t;
  })();
  const totalExpected = upstreamTotalForLot;
  const totalReceived = totalAlreadyReceived + totalFormActual;
  const totalDiff = totalReceived - totalExpected;
  const totalShortage = Math.max(0, totalExpected - totalReceived);
  const totalExcess = Math.max(0, totalDiff);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
            <Plus size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{moduleLabel} Entry</h1>
            <p className="text-sm text-slate-500">Receive actual PCS from {upstreamLabel} — tracks shortage and excess</p>
          </div>
        </div>
        {lotsWithUpstream.length > 0 && (
          <button className="btn-primary" onClick={() => openCreate()}><Plus size={18} /> Add {moduleLabel}</button>
        )}
      </div>

      {lotsWithUpstream.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={40} />} title={`No ${upstreamLabel.toLowerCase()} data`} message={`${moduleLabel} receives from ${upstreamLabel}. Add ${upstreamLabel.toLowerCase()} entries first.`} />
      ) : entries.length === 0 ? (
        <EmptyState icon={<Plus size={40} />} title={`No ${moduleLabel.toLowerCase()} entries`} message={`Record ${moduleLabel.toLowerCase()} quantities received from ${upstreamLabel.toLowerCase()}.`}
          action={<button className="btn-primary" onClick={() => openCreate()}><Plus size={18} /> Add {moduleLabel}</button>} />
      ) : (
        <div className="space-y-4">
          {data.lots.map((lot) => {
            const lotEntries = entries.filter((e) => e.lotId === lot.id);
            if (lotEntries.length === 0) return null;
            const upMap = upstreamMap(data, lot.id);
            let upTotal = 0;
            for (const [, sm] of upMap) for (const [, q] of sm) upTotal += q;
            const recvTotal = lotEntries.reduce((a, e) => a + totalColorSizeQty(e.colorSizes), 0);
            const lotShortage = Math.max(0, upTotal - recvTotal);
            const lotExcess = Math.max(0, recvTotal - upTotal);
            return (
              <div key={lot.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{lot.lotNo}</h3>
                    <p className="text-xs text-slate-500">Expected from {upstreamLabel}: {formatNum(upTotal)} pcs</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Received: <strong className="text-slate-700">{formatNum(recvTotal)}</strong></span>
                    {lotShortage > 0 && <span className="badge bg-err-100 text-err-700">Short: {formatNum(lotShortage)}</span>}
                    {lotExcess > 0 && <span className="badge bg-amber-100 text-amber-700">Excess: {formatNum(lotExcess)}</span>}
                    <span className="text-xs text-slate-400">{lotEntries.length} entr{lotEntries.length > 1 ? 'ies' : 'y'}</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Date</th>
                        <th className="th">Color / Size Breakdown</th>
                        <th className="th text-right">Total PCS</th>
                        <th className="th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lotEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="td">{formatDate(entry.date)}</td>
                          <td className="td">
                            <div className="flex flex-wrap gap-1">
                              {entry.colorSizes.map((cs) => (
                                <span key={cs.colorId} className="badge bg-brand-50 text-brand-700">
                                  {colorName(lot.fabricId, cs.colorId)}: {cs.sizes.map((s) => `${s.size}=${s.qty}`).join(', ')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="td text-right font-medium">{formatNum(totalColorSizeQty(entry.colorSizes))}</td>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? `Edit ${moduleLabel} Entry` : `Add ${moduleLabel} Entry`} size="xl"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Lot</label>
              <select className="input" value={form.lotId} onChange={(e) => onLotChange(e.target.value)} disabled={!!editId}>
                <option value="">Select lot</option>
                {lotsWithUpstream.map((l) => <option key={l.id} value={l.id}>{l.lotNo}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          {selectedLot && (
            <div>
              <label className="label">{moduleLabel} Quantity — Actual PCS from {upstreamLabel}</label>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Color</th>
                      {selectedLot.sizes.map((s) => <th key={s} className="th text-center">{s}</th>)}
                      <th className="th text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.colorSizes.map((cs) => {
                      const upSizes = upstreamData.get(cs.colorId) ?? new Map();
                      const curSizes = currentData.get(cs.colorId) ?? new Map();
                      return (
                        <tr key={cs.colorId}>
                          <td className="td font-medium">{colorName(selectedLot.fabricId, cs.colorId)}</td>
                          {cs.sizes.map((s) => {
                            const available = upSizes.get(s.size) ?? 0;
                            const already = curSizes.get(s.size) ?? 0;
                            const editingThis = editId ? (entries.find((e) => e.id === editId)?.colorSizes.find((x) => x.colorId === cs.colorId)?.sizes.find((x) => x.size === s.size)?.qty ?? 0) : 0;
                            const remaining = available - already + editingThis;
                            const excess = s.qty > remaining;
                            return (
                              <td key={s.size} className="td p-1 min-w-[90px]">
                                <input type="number" min="0" className={`input text-center ${excess ? 'border-amber-400' : ''}`} value={s.qty || ''} onChange={(e) => setQty(cs.colorId, s.size, +e.target.value)} />
                                <p className={`text-[10px] text-center mt-0.5 ${remaining <= 0 ? 'text-err-500' : excess ? 'text-amber-500' : 'text-slate-400'}`}>
                                  exp: {formatNum(remaining)}
                                </p>
                              </td>
                            );
                          })}
                          <td className="td text-right font-medium text-brand-700">{formatNum(cs.sizes.reduce((a, b) => a + b.qty, 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedLot && (
            <div>
              <label className="label">Size-wise Expected vs Actual</label>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Size</th>
                      <th className="th text-right">Expected from {upstreamLabel}</th>
                      <th className="th text-right">Actual Received</th>
                      <th className="th text-right">Difference</th>
                      <th className="th text-right">Shortage</th>
                      <th className="th text-right">Excess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedLot.sizes.map((size) => {
                      const expected = [...(upstreamData.values())].reduce((a, sm) => a + (sm.get(size) ?? 0), 0);
                      const alreadyRecvd = [...(currentData.values())].reduce((a, sm) => a + (sm.get(size) ?? 0), 0);
                      const editingThis = editId
                        ? (entries.find((e) => e.id === editId)?.colorSizes.reduce((a, cs) => a + (cs.sizes.find((s) => s.size === size)?.qty ?? 0), 0) ?? 0)
                        : 0;
                      const thisFormAmt = form.colorSizes.reduce((a, cs) => a + (cs.sizes.find((s) => s.size === size)?.qty ?? 0), 0);
                      const actualTotal = alreadyRecvd - editingThis + thisFormAmt;
                      const diff = actualTotal - expected;
                      const shortage = Math.max(0, -diff);
                      const excess = Math.max(0, diff);
                      return (
                        <tr key={size} className="hover:bg-slate-50">
                          <td className="td font-semibold text-slate-700">{size}</td>
                          <td className="td text-right text-slate-600">{formatNum(expected)}</td>
                          <td className="td text-right font-medium text-slate-800">{formatNum(actualTotal)}</td>
                          <td className={`td text-right font-semibold ${diff === 0 ? 'text-slate-500' : diff > 0 ? 'text-amber-500' : 'text-err-600'}`}>
                            {diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}
                          </td>
                          <td className="td text-right">
                            {shortage > 0 ? <span className="badge bg-err-100 text-err-700">{formatNum(shortage)}</span> : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="td text-right">
                            {excess > 0 ? <span className="badge bg-amber-100 text-amber-700">{formatNum(excess)}</span> : <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                    <tr>
                      <td className="td">Total</td>
                      <td className="td text-right text-slate-700">{formatNum(totalExpected)}</td>
                      <td className="td text-right text-slate-800">{formatNum(totalReceived)}</td>
                      <td className={`td text-right ${totalDiff === 0 ? 'text-slate-500' : totalDiff > 0 ? 'text-amber-500' : 'text-err-600'}`}>
                        {totalDiff > 0 ? `+${formatNum(totalDiff)}` : formatNum(totalDiff)}
                      </td>
                      <td className="td text-right">
                        {totalShortage > 0 ? <span className="badge bg-err-100 text-err-700">{formatNum(totalShortage)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="td text-right">
                        {totalExcess > 0 ? <span className="badge bg-amber-100 text-amber-700">{formatNum(totalExcess)}</span> : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title={`Delete ${moduleLabel} Entry?`} message={`This cascade-deletes all downstream records linked to this ${moduleLabel.toLowerCase()} entry.`}
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

