import { useState, useMemo } from 'react';
import { Box, Plus, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getLotColorSizePress } from '../store/calculations';
import { now, today, formatDate, formatNum, clone } from '../utils/helpers';
import type { PackingEntry, PackSizeBox, Size } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

// Proportionally distribute pcsPerBox among colors with available pressing for a size
function distributeContents(
  colorIds: string[],
  availMap: Map<string, Map<Size, number>>,
  size: Size,
  pcsPerBox: number,
): { colorId: string; pcs: number }[] {
  const colorsWith = colorIds.filter((cId) => (availMap.get(cId)?.get(size) ?? 0) > 0);
  if (colorsWith.length === 0 || pcsPerBox === 0) {
    return colorIds.map((cId) => ({ colorId: cId, pcs: 0 }));
  }
  const total = colorsWith.reduce((a, cId) => a + (availMap.get(cId)?.get(size) ?? 0), 0);
  let remaining = pcsPerBox;
  const shared = new Map<string, number>();
  colorsWith.forEach((cId, i) => {
    const avail = availMap.get(cId)?.get(size) ?? 0;
    if (i === colorsWith.length - 1) {
      shared.set(cId, Math.max(0, remaining));
    } else {
      const share = Math.floor(pcsPerBox * avail / total);
      shared.set(cId, share);
      remaining -= share;
    }
  });
  return colorIds.map((cId) => ({ colorId: cId, pcs: shared.get(cId) ?? 0 }));
}

// Compute available pressing per color-size (excluding a specific packing entry when editing)
function computeAvailMap(
  data: ReturnType<typeof useStore>['data'],
  lotId: string,
  excludePackingId: string | null,
): Map<string, Map<Size, number>> {
  const pressMap = getLotColorSizePress(data, lotId);
  const lot = data.lots.find((l) => l.id === lotId);
  if (!lot) return new Map();
  // Sum packed from all entries except the excluded one
  const otherPacked = new Map<string, Map<Size, number>>();
  for (const p of data.packings) {
    if (p.lotId !== lotId || p.id === excludePackingId) continue;
    for (const box of p.boxes) {
      for (const c of box.contents) {
        if (!otherPacked.has(c.colorId)) otherPacked.set(c.colorId, new Map());
        const cur = otherPacked.get(c.colorId)!.get(box.size) ?? 0;
        otherPacked.get(c.colorId)!.set(box.size, cur + c.pcs * box.boxes);
      }
    }
  }
  const result = new Map<string, Map<Size, number>>();
  for (const colorId of lot.colorIds) {
    const sizeMap = new Map<Size, number>();
    for (const size of lot.sizes) {
      const pressed = pressMap.get(colorId)?.get(size) ?? 0;
      const packed = otherPacked.get(colorId)?.get(size) ?? 0;
      sizeMap.set(size, Math.max(0, pressed - packed));
    }
    result.set(colorId, sizeMap);
  }
  return result;
}

function initBoxes(
  lot: ReturnType<typeof useStore>['data']['lots'][0],
  availMap: Map<string, Map<Size, number>>,
  pcsPerBox: number,
): PackSizeBox[] {
  return lot.sizes.map((size) => {
    const total = lot.colorIds.reduce((a, cId) => a + (availMap.get(cId)?.get(size) ?? 0), 0);
    const fullBoxes = pcsPerBox > 0 ? Math.floor(total / pcsPerBox) : 0;
    return {
      size,
      boxes: fullBoxes,
      pcsPerBox,
      contents: distributeContents(lot.colorIds, availMap, size, pcsPerBox),
    };
  });
}

export default function PackingEntryPage() {
  const { data, savePackingEntry, deletePackingEntry, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<{ lotId: string; date: string; pcsPerBox: number; boxes: PackSizeBox[]; notes: string }>({
    lotId: '', date: today(), pcsPerBox: 0, boxes: [], notes: '',
  });

  const colorName = (fabricId: string, colorId: string) =>
    data.fabrics.find((f) => f.id === fabricId)?.colors.find((c) => c.id === colorId)?.name ?? '—';

  const selectedLot = data.lots.find((l) => l.id === form.lotId);
  const availMap = useMemo(
    () => (selectedLot ? computeAvailMap(data, selectedLot.id, editId) : new Map()),
    [data, selectedLot?.id, editId],
  );

  const lotsWithPressing = data.lots.filter((l) => {
    const press = getLotColorSizePress(data, l.id);
    let total = 0;
    for (const [, sm] of press) for (const [, q] of sm) total += q;
    return total > 0;
  });

  const openCreate = () => {
    setEditId(null);
    const firstLot = data.lots[0];
    if (!firstLot) { setForm({ lotId: '', date: today(), pcsPerBox: 0, boxes: [], notes: '' }); setModalOpen(true); return; }
    const av = computeAvailMap(data, firstLot.id, null);
    setForm({ lotId: firstLot.id, date: today(), pcsPerBox: 0, boxes: initBoxes(firstLot, av, 0), notes: '' });
    setModalOpen(true);
  };

  const openEdit = (entry: PackingEntry) => {
    setEditId(entry.id);
    setForm({ lotId: entry.lotId, date: entry.date, pcsPerBox: entry.pcsPerBox ?? 0, boxes: clone(entry.boxes), notes: entry.notes ?? '' });
    setModalOpen(true);
  };

  const onLotChange = (lotId: string) => {
    const lot = data.lots.find((l) => l.id === lotId);
    if (!lot) { setForm((f) => ({ ...f, lotId, boxes: [] })); return; }
    const av = computeAvailMap(data, lotId, editId);
    setForm((f) => ({ ...f, lotId, boxes: initBoxes(lot, av, f.pcsPerBox) }));
  };

  const onPcsPerBoxChange = (pcsPerBox: number) => {
    if (!selectedLot) { setForm((f) => ({ ...f, pcsPerBox })); return; }
    setForm((f) => ({
      ...f,
      pcsPerBox,
      boxes: f.boxes.map((box) => {
        const total = selectedLot.colorIds.reduce((a, cId) => a + (availMap.get(cId)?.get(box.size) ?? 0), 0);
        const fullBoxes = pcsPerBox > 0 ? Math.floor(total / pcsPerBox) : 0;
        return {
          ...box,
          boxes: fullBoxes,
          pcsPerBox,
          contents: distributeContents(selectedLot.colorIds, availMap, box.size, pcsPerBox),
        };
      }),
    }));
  };

  const setBoxCount = (sizeIdx: number, boxes: number) => {
    setForm((f) => ({ ...f, boxes: f.boxes.map((b, i) => i === sizeIdx ? { ...b, boxes } : b) }));
  };

  const setBoxPcs = (sizeIdx: number, colorId: string, pcs: number) => {
    setForm((f) => ({
      ...f,
      boxes: f.boxes.map((b, i) => i === sizeIdx ? {
        ...b,
        contents: b.contents.map((c) => c.colorId === colorId ? { ...c, pcs } : c),
      } : b),
    }));
  };

  const save = async () => {
    if (!form.lotId) { alert('Select a lot'); return; }
    const lot = data.lots.find((l) => l.id === form.lotId);
    if (!lot) return;
    if (form.pcsPerBox <= 0) { alert('Enter PCS Per Box'); return; }

    // Validate: no color-size overpack
    for (const box of form.boxes) {
      if (box.boxes === 0) continue;
      for (const c of box.contents) {
        if (c.pcs === 0) continue;
        const totalPacking = c.pcs * box.boxes;
        const available = availMap.get(c.colorId)?.get(box.size) ?? 0;
        if (totalPacking > available) {
          const cn = colorName(lot.fabricId, c.colorId);
          if (!confirm(`${cn} ${box.size}: packing ${totalPacking} but only ${formatNum(available)} available from pressing. Continue?`)) return;
        }
      }
    }

    if (editId) {
      const existing = data.packings.find((p) => p.id === editId)!;
      await savePackingEntry({ ...existing, lotId: form.lotId, date: form.date, pcsPerBox: form.pcsPerBox, boxes: form.boxes, notes: form.notes });
      addHistory('Packing', 'Edit', `Updated packing for lot ${lot.lotNo}`);
    } else {
      const entry: PackingEntry = { id: '', lotId: form.lotId, pressingId: '', date: form.date, pcsPerBox: form.pcsPerBox, boxes: form.boxes, notes: form.notes, createdAt: now() };
      await savePackingEntry(entry);
      const totalBoxes = form.boxes.reduce((a, b) => a + b.boxes, 0);
      addHistory('Packing', 'Create', `Packing for lot ${lot.lotNo}: ${totalBoxes} boxes`);
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const entry = data.packings.find((p) => p.id === deleteId);
    const lot = data.lots.find((l) => l.id === entry?.lotId);
    await deletePackingEntry(deleteId);
    addHistory('Packing', 'Delete', `Deleted packing for lot ${lot?.lotNo}`);
    setDeleteId(null);
  };

  return (
    <div>
      <PageHeader title="Packing Entry" subtitle="Multi-color packing — one size box can contain multiple colors" icon={<Box size={22} />}
        action={lotsWithPressing.length > 0 ? { label: 'Add Packing', onClick: openCreate } : undefined} />

      {lotsWithPressing.length === 0 ? (
        <EmptyState icon={<Box size={40} />} title="No pressing data" message="Packing receives from pressing. Add pressing entries first." />
      ) : data.packings.length === 0 ? (
        <EmptyState icon={<Box size={40} />} title="No packing entries" message="Create packing entries with multi-color boxes."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={18} /> Add Packing</button>} />
      ) : (
        <div className="space-y-4">
          {data.lots.map((lot) => {
            const entries = data.packings.filter((p) => p.lotId === lot.id);
            if (entries.length === 0) return null;
            return (
              <div key={lot.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">{lot.lotNo}</h3>
                  <span className="text-xs text-slate-500">{entries.length} entr{entries.length > 1 ? 'ies' : 'y'}</span>
                </div>
                {entries.map((entry) => {
                  const totalBoxes = entry.boxes.reduce((a, b) => a + b.boxes, 0);
                  const totalPcs = entry.boxes.reduce((a, b) => a + b.boxes * b.contents.reduce((x, c) => x + c.pcs, 0), 0);
                  return (
                    <div key={entry.id} className="border-b border-slate-100 last:border-0">
                      <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-500">{formatDate(entry.date)}</span>
                          {entry.pcsPerBox > 0 && <span className="badge bg-slate-100 text-slate-600">{entry.pcsPerBox} PCS/box</span>}
                          <span className="badge bg-brand-100 text-brand-700">{formatNum(totalBoxes)} boxes</span>
                          <span className="badge bg-accent-100 text-accent-700">{formatNum(totalPcs)} pcs</span>
                        </div>
                        <div className="flex gap-1">
                          <button className="btn-ghost" onClick={() => openEdit(entry)}><Edit2 size={16} /></button>
                          <button className="btn-ghost text-err-600" onClick={() => setDeleteId(entry.id)}><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="px-5 pb-4 overflow-x-auto">
                        <table className="w-full text-sm border border-slate-200 rounded-lg">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="th">Size</th>
                              <th className="th">Color Breakdown (per box)</th>
                              <th className="th text-center">PCS/Box</th>
                              <th className="th text-center">Boxes</th>
                              <th className="th text-right">Total PCS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {entry.boxes.filter((b) => b.boxes > 0).map((box) => (
                              <tr key={box.size}>
                                <td className="td font-medium">{box.size}</td>
                                <td className="td">
                                  <div className="flex flex-wrap gap-1">
                                    {box.contents.filter((c) => c.pcs > 0).map((c) => (
                                      <span key={c.colorId} className="badge bg-slate-100 text-slate-700">
                                        {colorName(lot.fabricId, c.colorId)}: {c.pcs}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="td text-center">{box.contents.reduce((a, c) => a + c.pcs, 0)}</td>
                                <td className="td text-center font-medium">{box.boxes}</td>
                                <td className="td text-right font-medium text-brand-700">{formatNum(box.boxes * box.contents.reduce((a, c) => a + c.pcs, 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Packing Entry' : 'Add Packing Entry'} size="xl"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-5">
          {/* Row 1: Lot + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Lot</label>
              <select className="input" value={form.lotId} onChange={(e) => onLotChange(e.target.value)} disabled={!!editId}>
                <option value="">Select lot</option>
                {lotsWithPressing.map((l) => <option key={l.id} value={l.id}>{l.lotNo}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          {/* Row 2: Global PCS Per Box */}
          <div className="p-4 rounded-lg bg-brand-50 border border-brand-100">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="label text-brand-700">PCS Per Box <span className="text-brand-500 font-normal">(global — applies to all sizes)</span></label>
                <input
                  type="number"
                  min="1"
                  className="input max-w-xs"
                  placeholder="e.g. 8"
                  value={form.pcsPerBox || ''}
                  onChange={(e) => onPcsPerBoxChange(+e.target.value || 0)}
                />
              </div>
              {form.pcsPerBox > 0 && selectedLot && (
                <div className="text-sm text-brand-700">
                  <p>Changing this instantly recalculates all sizes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Per-size sections */}
          {selectedLot && form.pcsPerBox > 0 && (
            <div className="space-y-4">
              <label className="label">Size-wise Box Configuration</label>
              {form.boxes.map((box, sizeIdx) => {
                // Only show colors with available pressing for this size
                const colorsForSize = selectedLot.colorIds.filter((cId) => (availMap.get(cId)?.get(box.size) ?? 0) > 0);
                const totalAvail = selectedLot.colorIds.reduce((a, cId) => a + (availMap.get(cId)?.get(box.size) ?? 0), 0);
                const autoBoxes = form.pcsPerBox > 0 ? Math.floor(totalAvail / form.pcsPerBox) : 0;
                const packedPcs = box.boxes * form.pcsPerBox;
                const leftPcs = Math.max(0, totalAvail - packedPcs);
                const excessPcs = packedPcs > totalAvail ? packedPcs - totalAvail : 0;

                if (totalAvail === 0) return null;

                return (
                  <div key={box.size} className="p-4 rounded-lg border border-slate-200">
                    {/* Size header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-800 text-base">Size: {box.size}</h4>
                      <div className="flex gap-2 text-xs">
                        <span className="badge bg-slate-100 text-slate-600">Pressed: {formatNum(totalAvail)}</span>
                        <span className="badge bg-brand-100 text-brand-700">Auto: {autoBoxes} boxes</span>
                        <span className="badge bg-accent-100 text-accent-700">Packed: {formatNum(packedPcs)}</span>
                        {leftPcs > 0 && <span className="badge bg-warn-100 text-warn-700">Left: {formatNum(leftPcs)}</span>}
                        {excessPcs > 0 && <span className="badge bg-err-100 text-err-700">Excess: {formatNum(excessPcs)}</span>}
                      </div>
                    </div>

                    {/* Per-color inputs (only colors with pressing for this size) */}
                    {colorsForSize.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {colorsForSize.map((cId) => {
                          const avail = availMap.get(cId)?.get(box.size) ?? 0;
                          const pcs = box.contents.find((c) => c.colorId === cId)?.pcs ?? 0;
                          return (
                            <div key={cId}>
                              <label className="text-xs text-slate-600">
                                {colorName(selectedLot.fabricId, cId)}
                                <span className="text-slate-400"> (avail: {formatNum(avail)})</span>
                              </label>
                              <input
                                type="number"
                                className="input"
                                placeholder="PCS per box"
                                value={pcs || ''}
                                onChange={(e) => setBoxPcs(sizeIdx, cId, +e.target.value || 0)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Boxes count */}
                    <div className="flex items-center gap-4">
                      <div className="w-40">
                        <label className="text-xs text-slate-600">Number of Boxes</label>
                        <input
                          type="number"
                          className="input"
                          value={box.boxes || ''}
                          onChange={(e) => setBoxCount(sizeIdx, +e.target.value || 0)}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-4">
                        PCS/Box = {box.contents.reduce((a, c) => a + c.pcs, 0)} | Total = {formatNum(box.boxes * box.contents.reduce((a, c) => a + c.pcs, 0))} pcs
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedLot && form.pcsPerBox === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Enter PCS Per Box above to see size configuration.</p>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Packing Entry?" message="This will recalculate Cut PCS for the lot."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
