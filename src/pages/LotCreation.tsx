import { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, History, ChevronRight, ChevronDown, IndianRupee, TrendingUp, Wand2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getLotCostSummary } from '../store/costing';
import { uid, now, formatDate, formatNum, clone } from '../utils/helpers';
import { ALL_SIZES } from '../types';
import type { Lot, Size, LotColorPlan, SizePlan } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

type FormState = {
  lotNo: string;
  articleId: string;
  fabricId: string;
  colorIds: string[];
  sizes: Size[];
  colorPlans: LotColorPlan[];
  sizePlans: SizePlan[];
  sellingPricePerPcs: number;
};

export default function LotCreation() {
  const { data, saveLot, deleteLot: deleteLotDb, saveFabric, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyLot, setHistoryLot] = useState<Lot | null>(null);
  const [costingLotId, setCostingLotId] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const emptyForm = (): FormState => ({
    lotNo: `LOT-${String(data.lots.length + 1).padStart(3, '0')}`,
    articleId: '', fabricId: '', colorIds: [], sizes: [],
    colorPlans: [], sizePlans: [], sellingPricePerPcs: 0,
  });

  const [form, setForm] = useState<FormState>(emptyForm);

  const openCreate = () => { setEditId(null); setSummaryExpanded(false); setForm(emptyForm()); setModalOpen(true); };

  const openEdit = (lot: Lot) => {
    setEditId(lot.id);
    setSummaryExpanded(false);
    setForm({
      lotNo: lot.lotNo, articleId: lot.articleId, fabricId: lot.fabricId,
      colorIds: [...lot.colorIds], sizes: [...lot.sizes],
      colorPlans: clone(lot.colorPlans).map((cp: LotColorPlan) => ({ ...cp, rollsSelected: cp.rollsSelected ?? 0 })),
      sizePlans: clone(lot.sizePlans ?? []),
      sellingPricePerPcs: lot.sellingPricePerPcs,
    });
    setModalOpen(true);
  };

  // ── derived values ──────────────────────────────────────────────────────────
  const selectedFabric = data.fabrics.find((f) => f.id === form.fabricId);
  const selectedArticle = data.articles.find((a) => a.id === form.articleId);

  // Avg fabric consumption per piece from size-wise consumption table
  const avgFabricConsumption = selectedArticle && selectedArticle.consumption.length > 0
    ? selectedArticle.consumption.reduce((a, c) => a + c.consumption, 0) / selectedArticle.consumption.length
    : 0;

  // For each color plan, plannedFabric = rollsSelected × avgKgPerRoll
  const getColorAvgPerRoll = (colorId: string): number => {
    const color = selectedFabric?.colors.find((c) => c.id === colorId);
    if (!color || color.rolls === 0) return 0;
    return color.stock / color.rolls;
  };

  // Fabric derived from rolls
  const fabricFromRolls = (colorId: string, rollsSelected: number): number => {
    return getColorAvgPerRoll(colorId) * rollsSelected;
  };

  // Total allocated fabric (sum of all color plans, computed from rolls)
  const totalAllocatedFabric = form.colorPlans.reduce((a, cp) => a + (cp.plannedFabric || 0), 0);

  // Planned PCS derived from total fabric / consumption per piece
  const plannedProduction = avgFabricConsumption > 0
    ? Math.floor(totalAllocatedFabric / avgFabricConsumption)
    : 0;

  // ── event handlers ──────────────────────────────────────────────────────────
  const onArticleChange = (articleId: string) => {
    const article = data.articles.find((a) => a.id === articleId);
    if (!article) { setForm((f) => ({ ...f, articleId: '', fabricId: '' })); return; }
    const sizes = article.consumption.map((c) => c.size);
    setForm((f) => ({
      ...f, articleId, fabricId: article.fabricId, sizes,
      colorPlans: f.colorIds.map((cId) => ({ colorId: cId, plannedFabric: 0, rollsSelected: 0 })),
      sizePlans: sizes.map((s) => ({ size: s, plannedPcs: 0 })),
    }));
  };

  const toggleColor = (colorId: string) => {
    setForm((f) => {
      const exists = f.colorIds.includes(colorId);
      const colorIds = exists ? f.colorIds.filter((c) => c !== colorId) : [...f.colorIds, colorId];
      const colorPlans = colorIds.map((cId) => {
        const existing = f.colorPlans.find((cp) => cp.colorId === cId);
        return existing ?? { colorId: cId, plannedFabric: 0, rollsSelected: 0 };
      });
      return { ...f, colorIds, colorPlans };
    });
  };

  const toggleSize = (size: Size) => {
    setForm((f) => {
      const exists = f.sizes.includes(size);
      const sizes = exists ? f.sizes.filter((s) => s !== size) : [...f.sizes, size];
      const sizePlans = sizes.map((s) => f.sizePlans.find((sp) => sp.size === s) ?? { size: s, plannedPcs: 0 });
      return { ...f, sizes, sizePlans };
    });
  };

  const setRollsSelected = (colorId: string, rolls: number) => {
    const color = selectedFabric?.colors.find((c) => c.id === colorId);
    const maxRolls = color?.rolls ?? 0;
    // get previous rolls for this color (when editing, account for rolls that were already committed)
    const prevRolls = editId
      ? (data.lots.find((l) => l.id === editId)?.colorPlans.find((cp) => cp.colorId === colorId)?.rollsSelected ?? 0)
      : 0;
    const availableRolls = maxRolls - Math.max(0, (color?.used ?? 0) > 0 ? 0 : 0) + prevRolls;
    const clamped = Math.min(Math.max(0, rolls), availableRolls);
    const fabric = fabricFromRolls(colorId, clamped);
    setForm((f) => ({
      ...f,
      colorPlans: f.colorPlans.map((cp) =>
        cp.colorId === colorId ? { ...cp, rollsSelected: clamped, plannedFabric: fabric } : cp,
      ),
    }));
  };

  const autoDistributeSizes = () => {
    if (form.sizes.length === 0 || plannedProduction <= 0) return;
    const base = Math.floor(plannedProduction / form.sizes.length);
    const remainder = plannedProduction - base * form.sizes.length;
    const sizePlans: SizePlan[] = form.sizes.map((s, i) => ({
      size: s,
      plannedPcs: i === form.sizes.length - 1 ? base + remainder : base,
    }));
    setForm((f) => ({ ...f, sizePlans }));
  };

  const setSizePcs = (size: Size, val: number) => {
    setForm((f) => ({
      ...f,
      sizePlans: f.sizePlans.map((sp) => sp.size === size ? { ...sp, plannedPcs: Math.max(0, val) } : sp),
    }));
  };

  // ── save ────────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.lotNo.trim() || !form.articleId || form.colorIds.length === 0 || form.sizes.length === 0) {
      alert('Fill all required fields: lot no, article, at least one color and one size');
      return;
    }
    const dup = data.lots.find((l) => l.lotNo.toLowerCase() === form.lotNo.toLowerCase() && l.id !== editId);
    if (dup) { alert('Lot number already exists'); return; }

    const fabric = data.fabrics.find((f) => f.id === form.fabricId);
    if (fabric) {
      for (const cp of form.colorPlans) {
        const color = fabric.colors.find((c) => c.id === cp.colorId);
        if (!color) continue;
        const prevRolls = editId ? (data.lots.find((l) => l.id === editId)?.colorPlans.find((p) => p.colorId === cp.colorId)?.rollsSelected ?? 0) : 0;
        const availableRolls = color.rolls - (/* used rolls approximation */ 0) + prevRolls;
        if (cp.rollsSelected > color.rolls) {
          if (!confirm(`${color.name}: selected ${cp.rollsSelected} rolls but only ${color.rolls} available. Continue?`)) return;
        }
      }
    }

    const sizePcsTotal = form.sizePlans.reduce((a, sp) => a + (sp.plannedPcs || 0), 0);
    if (sizePcsTotal > plannedProduction && plannedProduction > 0) {
      alert(`Size-wise total (${sizePcsTotal} pcs) exceeds Planned PCS (${plannedProduction} pcs). Please adjust.`);
      return;
    }

    if (editId) {
      const oldLot = data.lots.find((l) => l.id === editId)!;
      // Update fabric used tracking
      const fabric = data.fabrics.find((f) => f.id === oldLot.fabricId);
      if (fabric) {
        const updatedColors = fabric.colors.map((c) => {
          const oldPlan = oldLot.colorPlans.find((cp) => cp.colorId === c.id);
          const newPlan = form.colorPlans.find((cp) => cp.colorId === c.id);
          let used = c.used;
          if (oldPlan) used -= oldPlan.plannedFabric;
          if (newPlan) used += newPlan.plannedFabric;
          return { ...c, used: Math.max(0, used) };
        });
        await saveFabric({ ...fabric, colors: updatedColors });
      }
      await saveLot({ ...oldLot, lotNo: form.lotNo, articleId: form.articleId, fabricId: form.fabricId, colorIds: form.colorIds, sizes: form.sizes, colorPlans: form.colorPlans, sizePlans: form.sizePlans, plannedProduction, sellingPricePerPcs: form.sellingPricePerPcs });
      addHistory('Lot Creation', 'Edit', `Updated lot: ${form.lotNo}`);
    } else {
      const lot: Lot = {
        id: uid('l_'), lotNo: form.lotNo, articleId: form.articleId, fabricId: form.fabricId,
        colorIds: form.colorIds, sizes: form.sizes, colorPlans: form.colorPlans, sizePlans: form.sizePlans,
        plannedProduction, sellingPricePerPcs: form.sellingPricePerPcs,
        status: 'Active', createdAt: now(),
      };
      // Update fabric used tracking
      const fabric = data.fabrics.find((f) => f.id === form.fabricId);
      if (fabric) {
        const updatedColors = fabric.colors.map((c) => {
          const plan = form.colorPlans.find((cp) => cp.colorId === c.id);
          return plan ? { ...c, used: c.used + plan.plannedFabric } : c;
        });
        await saveFabric({ ...fabric, colors: updatedColors });
      }
      await saveLot(lot);
      addHistory('Lot Creation', 'Create', `Created lot: ${form.lotNo} | ${form.colorIds.length} colors | ${form.sizes.length} sizes | ${plannedProduction} pcs @ ₹${form.sellingPricePerPcs}/pcs`);
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const lot = data.lots.find((l) => l.id === deleteId);
    // Restore fabric used tracking
    const fabric = lot ? data.fabrics.find((f) => f.id === lot.fabricId) : null;
    if (fabric && lot) {
      const updatedColors = fabric.colors.map((c) => {
        const plan = lot.colorPlans.find((cp) => cp.colorId === c.id);
        return plan ? { ...c, used: Math.max(0, c.used - plan.plannedFabric) } : c;
      });
      await saveFabric({ ...fabric, colors: updatedColors });
    }
    await deleteLotDb(deleteId);
    addHistory('Lot Creation', 'Delete', `Deleted lot: ${lot?.lotNo}`);
    setDeleteId(null);
  };

  const articleDisplay = (id: string) => data.articles.find((a) => a.id === id);
  const fabricDisplay = (id: string) => data.fabrics.find((f) => f.id === id);
  const colorName = (fabricId: string, colorId: string) =>
    data.fabrics.find((f) => f.id === fabricId)?.colors.find((c) => c.id === colorId)?.name ?? '—';

  // Live costing preview
  const previewCost = selectedArticle && plannedProduction > 0
    ? getLotCostSummary(
        { ...data, lots: [{ id: '_prev', lotNo: form.lotNo, articleId: form.articleId, fabricId: form.fabricId, colorIds: form.colorIds, sizes: form.sizes, colorPlans: form.colorPlans, sizePlans: form.sizePlans, plannedProduction, sellingPricePerPcs: form.sellingPricePerPcs, status: 'Active', createdAt: now() }] },
        '_prev',
      )
    : null;

  const costingLot = costingLotId ? data.lots.find((l) => l.id === costingLotId) : null;
  const costingSummary = costingLotId ? getLotCostSummary(data, costingLotId) : null;

  const sizePcsTotal = form.sizePlans.reduce((a, sp) => a + (sp.plannedPcs || 0), 0);

  return (
    <div>
      <PageHeader title="Lot Creation" subtitle="Create production lots with roll-based fabric allocation and auto-calculated planned PCS" icon={<Layers size={22} />}
        action={{ label: 'Create Lot', onClick: openCreate }} />

      {data.lots.length === 0 ? (
        <EmptyState icon={<Layers size={40} />} title="No lots yet" message="Create a lot by selecting an article, colors (by roll), active sizes and selling price."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={18} /> Create Lot</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.lots.map((lot) => {
            const art = articleDisplay(lot.articleId);
            const fab = fabricDisplay(lot.fabricId);
            const cost = getLotCostSummary(data, lot.id);
            return (
              <div key={lot.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{lot.lotNo}</h3>
                    <p className="text-xs text-slate-500">{art?.code} · {art?.name}</p>
                  </div>
                  <span className={`badge ${lot.status === 'Active' ? 'bg-accent-100 text-accent-700' : 'bg-slate-100 text-slate-600'}`}>{lot.status}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Fabric</span><span className="font-medium text-slate-700">{fab?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Planned PCS</span><span className="font-medium text-slate-700">{formatNum(lot.plannedProduction)} pcs</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Selling Price</span><span className="font-medium text-slate-700">₹{formatNum(lot.sellingPricePerPcs, 2)}/pcs</span></div>
                  {cost && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Cost Per Piece</span><span className="font-medium text-slate-700">₹{formatNum(cost.costPerPiece, 2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Profit Per Piece</span>
                        <span className={`font-medium ${cost.profitPerPcs >= 0 ? 'text-accent-600' : 'text-err-600'}`}>₹{formatNum(cost.profitPerPcs, 2)}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-slate-500">Revenue</span><span className="font-medium text-slate-700">₹{formatNum(cost.totalRevenue, 0)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Profit</span>
                        <span className={`font-bold ${cost.grossProfit >= 0 ? 'text-accent-600' : 'text-err-600'}`}>₹{formatNum(cost.grossProfit, 0)} ({formatNum(cost.profitPercent, 1)}%)</span>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-slate-500 mb-1">Colors</p>
                    <div className="flex flex-wrap gap-1">
                      {lot.colorIds.map((cId) => <span key={cId} className="badge bg-brand-50 text-brand-700">{colorName(lot.fabricId, cId)}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Sizes</p>
                    <div className="flex flex-wrap gap-1">
                      {lot.sizes.map((s) => <span key={s} className="badge bg-slate-100 text-slate-700">{s}</span>)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-slate-100">
                  <button className="btn-ghost text-brand-600" onClick={() => setCostingLotId(lot.id)} title="Costing"><IndianRupee size={16} /></button>
                  <button className="btn-ghost" onClick={() => setHistoryLot(lot)} title="History"><History size={16} /></button>
                  <button className="btn-ghost" onClick={() => openEdit(lot)}><Edit2 size={16} /></button>
                  <button className="btn-ghost text-err-600" onClick={() => setDeleteId(lot.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Lot' : 'Create Lot'} size="xl"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-5">

          {/* Lot No + Article */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Lot Number</label>
              <input className="input" value={form.lotNo} onChange={(e) => setForm((f) => ({ ...f, lotNo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Article</label>
              <select className="input" value={form.articleId} onChange={(e) => onArticleChange(e.target.value)}>
                <option value="">Select article</option>
                {data.articles.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
            </div>
          </div>

          {form.fabricId && (
            <div className="p-3 rounded-lg bg-brand-50 border border-brand-100 flex flex-wrap items-center gap-3 text-sm text-brand-700">
              <ChevronRight size={16} />
              <span>Fabric: <strong>{fabricDisplay(form.fabricId)?.name}</strong> ({fabricDisplay(form.fabricId)?.unit})</span>
              {avgFabricConsumption > 0 && (
                <span className="ml-auto">Consumption: <strong>{formatNum(avgFabricConsumption, 3)} {selectedFabric?.unit}/pcs</strong></span>
              )}
            </div>
          )}

          {/* Colors */}
          {selectedFabric && (
            <div>
              <label className="label">Select Colors</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {selectedFabric.colors.map((color) => {
                  const selected = form.colorIds.includes(color.id);
                  const balance = color.stock - color.used;
                  return (
                    <button key={color.id} onClick={() => toggleColor(color.id)}
                      className={`p-3 rounded-lg border-2 text-left transition ${selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="text-sm font-medium text-slate-700">{color.name}</p>
                      <p className="text-xs text-slate-500">{color.rolls} rolls</p>
                      <p className="text-xs text-slate-400">{formatNum(balance, 1)} {selectedFabric.unit} avail</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Roll-based fabric allocation — drives planned PCS */}
          {form.colorPlans.length > 0 && selectedFabric && (
            <div>
              <label className="label">Roll Allocation per Color</label>
              <div className="space-y-3">
                {form.colorPlans.map((cp) => {
                  const color = selectedFabric.colors.find((c) => c.id === cp.colorId);
                  if (!color) return null;
                  const avgPerRoll = color.rolls > 0 ? color.stock / color.rolls : 0;
                  const selectedQty = cp.plannedFabric;
                  const remainingQty = (color.stock - color.used) - selectedQty;
                  const estRollsUsed = cp.rollsSelected;
                  const remainingRolls = color.rolls - cp.rollsSelected;
                  const colorPcs = avgFabricConsumption > 0 ? Math.floor(selectedQty / avgFabricConsumption) : 0;
                  const overLimit = cp.rollsSelected > color.rolls;
                  return (
                    <div key={cp.colorId} className={`p-3 rounded-lg border ${overLimit ? 'border-err-300 bg-err-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-semibold text-slate-700 w-20 shrink-0">{color.name}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <button type="button" onClick={() => setRollsSelected(cp.colorId, cp.rollsSelected - 1)}
                            className="w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-600 font-bold hover:bg-slate-100 transition flex items-center justify-center">−</button>
                          <input type="number" min="0" max={color.rolls}
                            className={`input text-center w-20 ${overLimit ? 'border-err-400' : ''}`}
                            value={cp.rollsSelected || ''}
                            onChange={(e) => setRollsSelected(cp.colorId, +e.target.value)} />
                          <button type="button" onClick={() => setRollsSelected(cp.colorId, cp.rollsSelected + 1)}
                            className="w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-600 font-bold hover:bg-slate-100 transition flex items-center justify-center">+</button>
                          <span className="text-xs text-slate-500">rolls (max {color.rolls})</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                        <div className="bg-white rounded p-2 border border-slate-200">
                          <p className="text-slate-400 mb-0.5">Avail Rolls</p>
                          <p className="font-semibold text-slate-700">{color.rolls}</p>
                        </div>
                        <div className="bg-white rounded p-2 border border-slate-200">
                          <p className="text-slate-400 mb-0.5">Avg/Roll</p>
                          <p className="font-semibold text-slate-700">{formatNum(avgPerRoll, 1)} {selectedFabric.unit}</p>
                        </div>
                        <div className="bg-white rounded p-2 border border-slate-200">
                          <p className="text-slate-400 mb-0.5">Selected Qty</p>
                          <p className="font-semibold text-brand-700">{formatNum(selectedQty, 2)} {selectedFabric.unit}</p>
                        </div>
                        <div className="bg-white rounded p-2 border border-slate-200">
                          <p className="text-slate-400 mb-0.5">Est. Rolls Used</p>
                          <p className={`font-semibold ${overLimit ? 'text-err-600' : 'text-slate-700'}`}>{estRollsUsed}</p>
                        </div>
                        <div className="bg-white rounded p-2 border border-slate-200">
                          <p className="text-slate-400 mb-0.5">Remaining Qty</p>
                          <p className={`font-semibold ${remainingQty < 0 ? 'text-err-600' : 'text-slate-700'}`}>{formatNum(Math.max(0, remainingQty), 1)} {selectedFabric.unit}</p>
                        </div>
                        <div className="bg-white rounded p-2 border border-slate-200">
                          <p className="text-slate-400 mb-0.5">Remaining Rolls</p>
                          <p className={`font-semibold ${remainingRolls < 0 ? 'text-err-600' : 'text-slate-700'}`}>{Math.max(0, remainingRolls)}</p>
                        </div>
                      </div>
                      {colorPcs > 0 && (
                        <p className="text-xs text-brand-600 mt-2 font-medium">→ Yields ~{formatNum(colorPcs)} pcs from this color</p>
                      )}
                      {overLimit && <p className="text-xs text-err-600 mt-1">Exceeds available rolls ({color.rolls})</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Planned PCS (auto-calculated banner) */}
          {selectedArticle && (
            <div className="p-4 rounded-lg bg-brand-600 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase opacity-80">Planned PCS (Auto-calculated)</p>
                  <p className="text-3xl font-bold">{formatNum(plannedProduction)} pcs</p>
                  {avgFabricConsumption > 0 && totalAllocatedFabric > 0 && (
                    <p className="text-xs opacity-70 mt-1">
                      {formatNum(totalAllocatedFabric, 2)} {selectedFabric?.unit} ÷ {formatNum(avgFabricConsumption, 3)} {selectedFabric?.unit}/pcs = {formatNum(plannedProduction)} pcs
                    </p>
                  )}
                </div>
                <div className="text-sm opacity-90 text-right">
                  <p>Total Fabric: <strong>{formatNum(totalAllocatedFabric, 2)} {selectedFabric?.unit ?? ''}</strong></p>
                  <p>Total Rolls: <strong>{form.colorPlans.reduce((a, cp) => a + cp.rollsSelected, 0)}</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* Sizes */}
          <div>
            <label className="label">Active Sizes</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((size) => {
                const selected = form.sizes.includes(size);
                return (
                  <button key={size} onClick={() => toggleSize(size)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size-wise PCS distribution */}
          {form.sizePlans.length > 0 && plannedProduction > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Size-wise Planned PCS</label>
                <button type="button" onClick={autoDistributeSizes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium hover:bg-brand-100 transition">
                  <Wand2 size={13} /> Auto Plan Sizes
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {form.sizePlans.map((sp) => (
                  <div key={sp.size}>
                    <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">{sp.size}</span>
                    <input type="number" min="0" className="input text-sm py-1.5" value={sp.plannedPcs || ''}
                      onChange={(e) => setSizePcs(sp.size, +e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Total: <span className={`font-semibold ${sizePcsTotal === plannedProduction ? 'text-accent-600' : sizePcsTotal > plannedProduction ? 'text-err-600' : 'text-amber-500'}`}>
                  {formatNum(sizePcsTotal)}
                </span>{' '}/ {formatNum(plannedProduction)} planned
              </p>
            </div>
          )}

          {/* Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Selling Price Per PCS (₹)</label>
              <input type="number" step="0.01" className="input" value={form.sellingPricePerPcs || ''}
                onChange={(e) => setForm((f) => ({ ...f, sellingPricePerPcs: +e.target.value }))} />
            </div>
          </div>

          {/* Collapsible Live Lot Summary */}
          {previewCost && previewCost.totalLotCost > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <button type="button" onClick={() => setSummaryExpanded((v) => !v)}
                className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand-600" />
                  <span className="text-sm font-semibold text-slate-700">Live Lot Summary</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">CPP: <strong className="text-brand-700">₹{formatNum(previewCost.costPerPiece, 2)}</strong></span>
                  <span className="text-slate-500">Cost: <strong className="text-slate-700">₹{formatNum(previewCost.totalLotCost, 0)}</strong></span>
                  <span className="text-slate-500">Revenue: <strong className="text-accent-600">₹{formatNum(previewCost.totalRevenue, 0)}</strong></span>
                  <span className={`font-bold ${previewCost.grossProfit >= 0 ? 'text-accent-600' : 'text-err-600'}`}>
                    {previewCost.grossProfit >= 0 ? '+' : ''}₹{formatNum(previewCost.grossProfit, 0)}
                  </span>
                  {summaryExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </div>
              </button>
              {summaryExpanded && (
                <div className="p-4 space-y-4">
                  {/* KPI grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {[
                      { label: 'Planned PCS', value: formatNum(plannedProduction), unit: 'pcs' },
                      { label: 'Cost Per Piece', value: `₹${formatNum(previewCost.costPerPiece, 2)}`, highlight: 'brand' },
                      { label: 'Profit Per Piece', value: `₹${formatNum(previewCost.profitPerPcs, 2)}`, highlight: previewCost.profitPerPcs >= 0 ? 'accent' : 'err' },
                      { label: 'Estimated Lot Cost', value: `₹${formatNum(previewCost.totalLotCost, 0)}` },
                      { label: 'Estimated Revenue', value: `₹${formatNum(previewCost.totalRevenue, 0)}`, highlight: 'accent' },
                      { label: 'Estimated Profit', value: `₹${formatNum(previewCost.grossProfit, 0)} (${formatNum(previewCost.profitPercent, 1)}%)`, highlight: previewCost.grossProfit >= 0 ? 'accent' : 'err' },
                    ].map((item) => (
                      <div key={item.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className={`font-bold text-sm ${item.highlight === 'brand' ? 'text-brand-700' : item.highlight === 'accent' ? 'text-accent-600' : item.highlight === 'err' ? 'text-err-600' : 'text-slate-800'}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Material breakdown table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="th">Material</th>
                          <th className="th">Category</th>
                          <th className="th text-right">Per Piece</th>
                          <th className="th text-right">Req. Qty</th>
                          <th className="th text-right">Rate</th>
                          <th className="th text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewCost.requirements.map((r) => (
                          <tr key={r.row.id} className="hover:bg-slate-50">
                            <td className="td">{r.material?.name ?? '—'}</td>
                            <td className="td"><span className="badge bg-slate-100 text-slate-600 text-xs">{r.material?.category ?? '—'}</span></td>
                            <td className="td text-right">{formatNum(r.perPiece, 3)} {r.material?.unit ?? ''}</td>
                            <td className="td text-right">{formatNum(r.requiredQty, 2)} {r.material?.unit ?? ''}</td>
                            <td className="td text-right">₹{formatNum(r.rate, r.rate < 1 ? 4 : 2)}</td>
                            <td className="td text-right font-medium">₹{formatNum(r.totalCost, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-100 font-semibold">
                        <tr>
                          <td className="td" colSpan={5}>Total Material Cost Per Piece</td>
                          <td className="td text-right text-brand-700">₹{formatNum(previewCost.costPerPiece, 2)}</td>
                        </tr>
                        <tr>
                          <td className="td" colSpan={5}>Total Lot Cost ({formatNum(plannedProduction)} pcs)</td>
                          <td className="td text-right text-brand-700">₹{formatNum(previewCost.totalLotCost, 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Lot?" message="This restores fabric stock and cascade-deletes all cuttings, finishings, pressings, packings and dispatches for this lot."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />

      <Modal open={!!historyLot} onClose={() => setHistoryLot(null)} title={`History — ${historyLot?.lotNo ?? ''}`} size="md">
        <div className="space-y-2">
          {data.history.filter((h) => h.module === 'Lot Creation').length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No history recorded.</p>
          ) : (
            data.history.filter((h) => h.module === 'Lot Creation').map((h) => (
              <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <span className={`badge ${h.action === 'Create' ? 'bg-accent-100 text-accent-700' : h.action === 'Edit' ? 'bg-brand-100 text-brand-700' : 'bg-err-100 text-err-700'}`}>{h.action}</span>
                <div className="flex-1"><p className="text-sm text-slate-700">{h.description}</p><p className="text-xs text-slate-400">{formatDate(h.timestamp)}</p></div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Costing modal */}
      <Modal open={!!costingLotId} onClose={() => setCostingLotId(null)} title={`Lot Costing — ${costingLot?.lotNo ?? ''}`} size="xl">
        {costingSummary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-500">Total Lot Cost</p><p className="text-lg font-bold text-slate-800">₹{formatNum(costingSummary.totalLotCost, 0)}</p></div>
              <div className="p-3 rounded-lg bg-brand-50"><p className="text-xs text-slate-500">Cost Per Piece</p><p className="text-lg font-bold text-brand-700">₹{formatNum(costingSummary.costPerPiece, 2)}</p></div>
              <div className="p-3 rounded-lg bg-accent-50"><p className="text-xs text-slate-500">Revenue</p><p className="text-lg font-bold text-accent-700">₹{formatNum(costingSummary.totalRevenue, 0)}</p></div>
              <div className={`p-3 rounded-lg ${costingSummary.grossProfit >= 0 ? 'bg-accent-50' : 'bg-err-50'}`}>
                <p className="text-xs text-slate-500">Gross Profit</p>
                <p className={`text-lg font-bold ${costingSummary.grossProfit >= 0 ? 'text-accent-700' : 'text-err-700'}`}>₹{formatNum(costingSummary.grossProfit, 0)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-500">Profit Per PCS</p><p className="font-bold text-slate-800">₹{formatNum(costingSummary.profitPerPcs, 2)}</p></div>
              <div className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-500">Profit %</p><p className="font-bold text-slate-800">{formatNum(costingSummary.profitPercent, 1)}%</p></div>
              <div className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-500">Margin %</p><p className="font-bold text-slate-800">{formatNum(costingSummary.marginPercent, 1)}%</p></div>
              <div className="p-3 rounded-lg bg-slate-50"><p className="text-xs text-slate-500">Planned PCS</p><p className="font-bold text-slate-800">{formatNum(costingSummary.lot.plannedProduction)}</p></div>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Material</th><th className="th">Category</th>
                    <th className="th text-right">Per Piece</th><th className="th text-right">Req. Qty</th>
                    <th className="th text-right">Rate</th><th className="th text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {costingSummary.requirements.map((r) => (
                    <tr key={r.row.id} className="hover:bg-slate-50">
                      <td className="td font-medium">{r.material?.name ?? '—'}</td>
                      <td className="td"><span className="badge bg-slate-100 text-slate-600">{r.material?.category ?? '—'}</span></td>
                      <td className="td text-right">{formatNum(r.perPiece, 3)} {r.material?.unit ?? ''}</td>
                      <td className="td text-right">{formatNum(r.requiredQty, 2)} {r.material?.unit ?? ''}</td>
                      <td className="td text-right">₹{formatNum(r.rate, r.rate < 1 ? 4 : 2)}</td>
                      <td className="td text-right font-medium text-brand-700">₹{formatNum(r.totalCost, 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold">
                  <tr><td className="td" colSpan={5}>Total Material Cost Per Piece</td><td className="td text-right text-brand-700">₹{formatNum(costingSummary.costPerPiece, 2)}</td></tr>
                  <tr><td className="td" colSpan={5}>Total Lot Production Cost</td><td className="td text-right text-brand-700">₹{formatNum(costingSummary.totalLotCost, 0)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">No costing data available.</p>
        )}
      </Modal>
    </div>
  );
}
