import { useState } from 'react';
import { Shirt, Plus, Edit2, Trash2, History, IndianRupee, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getArticleCostSummary } from '../store/costing';
import { uid, now, formatDate, formatNum } from '../utils/helpers';
import { ALL_SIZES } from '../types';
import type { Article, SizeConsumption, Size, ConsumptionRow, RawMaterial, MaterialCategory, Unit } from '../types';
import { ALL_CATEGORIES } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { Upload } from 'lucide-react';
import { readCsvFile } from '../utils/spreadsheet';

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export default function ArticleMaster() {
  const { data, saveArticle, saveRawMaterial, deleteArticle: deleteArticleDb, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyArticle, setHistoryArticle] = useState<Article | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItem, setCustomItem] = useState<{ name: string; category: MaterialCategory; unit: Unit; rate: number }>({ name: '', category: 'Other', unit: 'PCS', rate: 0 });

  const [form, setForm] = useState<{ code: string; name: string; fabricId: string; consumption: SizeConsumption[]; consumptionSheet: ConsumptionRow[] }>({
    code: '', name: '', fabricId: '', consumption: [], consumptionSheet: [],
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ code: '', name: '', fabricId: data.fabrics[0]?.id ?? '', consumption: [], consumptionSheet: [] });
    setModalOpen(true);
  };

  const openEdit = (article: Article) => {
    setEditId(article.id);
    setForm({ code: article.code, name: article.name, fabricId: article.fabricId, consumption: clone(article.consumption), consumptionSheet: clone(article.consumptionSheet).map((r) => ({ ...r, unitRate: r.unitRate ?? data.rawMaterials.find((m) => m.id === r.materialId)?.purchasePrice ?? 0, gstRate: r.gstRate ?? data.rawMaterials.find((m) => m.id === r.materialId)?.gst ?? 0 })) });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.fabricId) { alert('Fill all required fields'); return; }
    if (!editId) {
      const dup = data.articles.find((a) => a.code.toLowerCase() === form.code.toLowerCase() && (a.isCurrent ?? true));
      if (dup) { alert('Article code already exists'); return; }
    }

    const frozenSheet = form.consumptionSheet.map((r) => {
      const material = data.rawMaterials.find((m) => m.id === r.materialId);
      return { ...r, unitRate: Number.isFinite(r.unitRate) ? r.unitRate : (material?.purchasePrice ?? 0), gstRate: r.gstRate ?? material?.gst ?? 0 };
    });
    if (editId) {
      const existing = data.articles.find((a) => a.id === editId)!;
      const baseId = existing.baseArticleId || existing.id;
      const versionNumber = Math.max(1, ...data.articles.filter((a) => (a.baseArticleId || a.id) === baseId).map((a) => a.versionNumber ?? 1)) + 1;
      await saveArticle({ id: '', baseArticleId: baseId, versionNumber, isCurrent: true, code: existing.code, name: form.name, fabricId: form.fabricId, consumption: form.consumption, consumptionSheet: frozenSheet, createdAt: now() });
      addHistory('Article Master', 'Edit', `Created version V${versionNumber} for article: ${existing.code} - ${form.name}`);
    } else {
      const article: Article = { id: '', code: form.code, name: form.name, fabricId: form.fabricId, consumption: form.consumption, consumptionSheet: frozenSheet, versionNumber: 1, isCurrent: true, createdAt: now() };
      await saveArticle(article);
      addHistory('Article Master', 'Create', `Created article: ${form.code} - ${form.name}`);
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const article = data.articles.find((a) => a.id === deleteId);
    await deleteArticleDb(deleteId);
    addHistory('Article Master', 'Delete', `Deleted article: ${article?.code}`);
    setDeleteId(null);
  };

  const toggleSize = (size: Size) => {
    setForm((f) => {
      const exists = f.consumption.find((c) => c.size === size);
      if (exists) return { ...f, consumption: f.consumption.filter((c) => c.size !== size) };
      return { ...f, consumption: [...f.consumption, { size, consumption: 0 }] };
    });
  };

  const addConsumptionRow = () => {
    const firstMat = data.rawMaterials[0];
    setForm((f) => ({ ...f, consumptionSheet: [...f.consumptionSheet, { id: uid(), materialId: firstMat?.id ?? '', consumption: 0, unitRate: firstMat?.purchasePrice ?? 0, gstRate: firstMat?.gst ?? 0 }] }));
  };

  const removeConsumptionRow = (rowId: string) => {
    setForm((f) => ({ ...f, consumptionSheet: f.consumptionSheet.filter((r) => r.id !== rowId) }));
  };

  const updateConsumptionRow = (rowId: string, field: 'materialId' | 'consumption' | 'unitRate', val: string | number) => {
    setForm((f) => ({
      ...f,
      consumptionSheet: f.consumptionSheet.map((r) => {
        if (r.id !== rowId) return r;
        if (field === 'materialId') { const material = data.rawMaterials.find((m) => m.id === val); return { ...r, materialId: val as string, unitRate: material?.purchasePrice ?? 0, gstRate: material?.gst ?? 0 }; }
        if (field === 'unitRate') return { ...r, unitRate: Number(val) || 0 };
        return { ...r, consumption: val as number };
      }),
    }));
  };

  const createCustomItem = async () => {
    const name = customItem.name.trim();
    if (!name) { alert('Custom item ka naam bharein.'); return; }
    const existing = data.rawMaterials.find((m) => m.name.trim().toLowerCase() === name.toLowerCase());
    let material: RawMaterial;
    if (existing) {
      material = existing;
    } else {
      const created: RawMaterial = {
        id: '', name, category: customItem.category, unit: customItem.unit,
        purchasePrice: Number(customItem.rate) || 0, supplier: '', gst: 0, status: 'Active',
        remarks: 'Created from Article Master custom item', openingStock: 0, currentStock: 0,
        minStock: 0, createdAt: now(),
      };
      material = await saveRawMaterial(created);
    }
    setForm((f) => ({ ...f, consumptionSheet: [...f.consumptionSheet, { id: uid(), materialId: material.id, consumption: 0, unitRate: Number(customItem.rate) || material.purchasePrice || 0, gstRate: material.gst || 0 }] }));
    setCustomItem({ name: '', category: 'Other', unit: 'PCS', rate: 0 });
    setCustomItemOpen(false);
  };

  const fabricName = (id: string) => data.fabrics.find((f) => f.id === id)?.name ?? '—';

  const uploadArticles = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await readCsvFile(file); if (!rows.length) { alert('CSV empty hai. Required columns: Article Code, Article Name, Fabric'); return; }
      let added = 0, skipped = 0, invalid = 0;
      for (const r of rows) {
        const code = (r['article code'] || r['code'] || '').trim(), name = (r['article name'] || r['name'] || '').trim(), fabricName = (r['fabric'] || r['fabric name'] || '').trim();
        if (!code || !name || !fabricName) { invalid++; continue; }
        if (data.articles.some(a => a.code.toLowerCase() === code.toLowerCase() && (a.isCurrent ?? true))) { skipped++; continue; }
        const fabric = data.fabrics.find(f => f.name.toLowerCase() === fabricName.toLowerCase()); if (!fabric) { invalid++; continue; }
        const article: Article = { id: '', code, name, fabricId: fabric.id, consumption: [], consumptionSheet: [], versionNumber: 1, isCurrent: true, createdAt: now() };
        await saveArticle(article); added++;
      }
      addHistory('Article Master', 'Import', `Imported ${added} articles; skipped ${skipped} duplicates; invalid ${invalid}`); alert(`Upload complete. Added: ${added}, duplicates skipped: ${skipped}, invalid/missing fabric: ${invalid}. Configure article consumption after import.`);
    } catch (e) { alert(`Upload failed: ${e instanceof Error ? e.message : 'Invalid CSV file'}`); }
  };
  const downloadExcel = () => {
    const escapeHtml = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const headers = [
      'Article Code', 'Article Name', 'Version', 'Version Status', 'Fabric', 'Size',
      'Fabric Consumption', 'Material', 'Material Category', 'Material Consumption',
      'Unit', 'Unit Rate (INR)', 'GST (%)', 'Material Cost Per Piece (INR)',
      'Total Material Cost Per Piece (INR)', 'Total Cost Per Piece (INR)', 'GST @ 5% (INR)', 'Final Cost Per Piece (INR)', 'Created At',
    ];
    const rows: unknown[][] = [];
    const articles = [...data.articles].sort((a, b) =>
      a.code.localeCompare(b.code) || (a.versionNumber ?? 1) - (b.versionNumber ?? 1));

    for (const article of articles) {
      const summary = getArticleCostSummary(data, article);
      const fabric = data.fabrics.find((f) => f.id === article.fabricId);
      const materialRows = article.consumptionSheet.length ? article.consumptionSheet : [null];
      const sizeRows = article.consumption.length ? article.consumption : [null];
      for (const sizeRow of sizeRows) {
        for (const row of materialRows) {
          const material = row ? data.rawMaterials.find((m) => m.id === row.materialId) : undefined;
          const rate = row?.unitRate ?? material?.purchasePrice ?? 0;
          rows.push([
            article.code, article.name, `V${article.versionNumber ?? 1}`,
            (article.isCurrent ?? true) ? 'Current' : 'Archived', fabric?.name ?? '',
            sizeRow?.size ?? '', sizeRow?.consumption ?? '', material?.name ?? '',
            material?.category ?? '', row?.consumption ?? '', material?.unit ?? '',
            rate, row?.gstRate ?? material?.gst ?? 0,
            row ? row.consumption * rate : 0, summary.totalMaterialCost,
            summary.costPerPiece, summary.costPerPiece * 0.05, summary.costPerPiece * 1.05, article.createdAt,
          ]);
        }
      }
    }
    const table = `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${table}</body></html>`;
    const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Article-Master-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const liveCostSummary = form.consumptionSheet.length > 0
    ? getArticleCostSummary(
        { ...data, articles: [{ id: '_form', code: form.code, name: form.name, fabricId: form.fabricId, consumption: form.consumption, consumptionSheet: form.consumptionSheet, createdAt: now() }] },
        { id: '_form', code: form.code, name: form.name, fabricId: form.fabricId, consumption: form.consumption, consumptionSheet: form.consumptionSheet, createdAt: now() },
      )
    : null;

  return (
    <div>
      <PageHeader title="Article Master" subtitle="Define articles with size-wise fabric consumption and full consumption sheet" icon={<Shirt size={22} />}
        action={{ label: 'Add Article', onClick: openCreate }} />
      <div className="flex flex-wrap justify-end gap-2 mb-3">
        <button type="button" className="btn-secondary" onClick={downloadExcel} disabled={data.articles.length === 0}><Download size={16} /> Download Excel</button>
        <label className="btn-secondary cursor-pointer"><Upload size={16} /> Upload CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={(e) => { void uploadArticles(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>
      </div>

      {data.articles.length === 0 ? (
        <EmptyState icon={<Shirt size={40} />} title="No articles yet" message="Create an article with a consumption sheet to enable auto costing."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={18} /> Add Article</button>} />
      ) : (
        <div className="space-y-3">
          {data.articles.filter((a) => a.isCurrent ?? true).map((article) => {
            const summary = getArticleCostSummary(data, article);
            const expanded = expandedIds.has(article.id);
            return (
              <div key={article.id} className="card overflow-hidden">
                {/* ── Collapsed header (always visible) ── */}
                <button
                  type="button"
                  onClick={() => toggleExpand(article.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600 shrink-0"><Shirt size={20} /></div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{article.code} — {article.name}</h3>
                      <p className="text-xs text-slate-500">Fabric: {fabricName(article.fabricId)} · {article.consumptionSheet.length} materials</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Final Cost Per Piece (incl. 5% GST)</p>
                        <p className="font-bold text-brand-700">₹{formatNum(summary.costPerPiece * 1.05, 2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Materials</p>
                        <p className="font-bold text-slate-700">{article.consumptionSheet.length}</p>
                      </div>
                    </div>
                    {expanded
                      ? <ChevronDown size={18} className="text-slate-400 shrink-0" />
                      : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
                  </div>
                </button>

                {/* ── Expanded detail ── */}
                {expanded && (
                  <>
                    <div className="table-wrap border-t border-slate-200">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="th">Material</th>
                            <th className="th">Category</th>
                            <th className="th text-right">Consumption</th>
                            <th className="th text-right">Rate</th>
                            <th className="th text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {article.consumptionSheet.map((row) => {
                            const mat = data.rawMaterials.find((m) => m.id === row.materialId);
                            const rate = row.unitRate ?? mat?.purchasePrice ?? 0;
                            const cost = row.consumption * rate;
                            return (
                              <tr key={row.id} className="hover:bg-slate-50">
                                <td className="td font-medium">{mat?.name ?? '—'}</td>
                                <td className="td"><span className="badge bg-slate-100 text-slate-600">{mat?.category ?? '—'}</span></td>
                                <td className="td text-right">{formatNum(row.consumption, 3)} {mat?.unit ?? ''}</td>
                                <td className="td text-right">₹{formatNum(rate, rate < 1 ? 4 : 2)}</td>
                                <td className="td text-right font-medium text-brand-700">₹{formatNum(cost, 2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold">
                          <tr>
                            <td className="td" colSpan={4}>Total Material Cost Per Piece</td>
                            <td className="td text-right text-brand-700">₹{formatNum(summary.totalMaterialCost, 2)}</td>
                          </tr>
                          <tr>
                            <td className="td" colSpan={4}>Total Cost Per Piece</td>
                            <td className="td text-right">₹{formatNum(summary.costPerPiece, 2)}</td>
                          </tr>
                          <tr>
                            <td className="td" colSpan={4}>GST @ 5%</td>
                            <td className="td text-right">₹{formatNum(summary.costPerPiece * 0.05, 2)}</td>
                          </tr>
                          <tr className="bg-brand-50">
                            <td className="td font-bold" colSpan={4}>Final Cost Per Piece (Including 5% GST)</td>
                            <td className="td text-right font-bold text-brand-700">₹{formatNum(summary.costPerPiece * 1.05, 2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {/* Category cost strip */}
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {summary.byCategory.filter((c) => c.total > 0).map((c) => (
                        <span key={c.category} className="text-slate-500">{c.category}: <strong className="text-slate-800">₹{formatNum(c.total, 2)}</strong></span>
                      ))}
                    </div>
                    {/* Actions row */}
                    <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white">
                      <span className="text-xs text-slate-400">Added {formatDate(article.createdAt)}</span>
                      <div className="flex gap-1">
                        <button className="btn-ghost" onClick={() => setHistoryArticle(article)} title="History"><History size={16} /></button>
                        <button className="btn-ghost" onClick={() => openEdit(article)}><Edit2 size={16} /></button>
                        <button className="btn-ghost text-err-600" onClick={() => setDeleteId(article.id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Article' : 'Add Article'} size="xl"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Article Code</label>
              <input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="ART-001" />
            </div>
            <div>
              <label className="label">Article Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Round Neck T-Shirt" />
            </div>
            <div>
              <label className="label">Fabric</label>
              <select className="input" value={form.fabricId} onChange={(e) => setForm((f) => ({ ...f, fabricId: e.target.value }))}>
                <option value="">Select fabric</option>
                {data.fabrics.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Select Sizes</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_SIZES.map((size) => {
                const selected = form.consumption.find((c) => c.size === size);
                return (
                  <div key={size} className={`p-3 rounded-lg border-2 transition ${selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!selected} onChange={() => toggleSize(size)} className="rounded" />
                      <span className="text-sm font-medium text-slate-700">{size}</span>
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">Only selected sizes flow through the production pipeline. Fabric consumption is not entered here.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Consumption Sheet</label>
              <div className="flex gap-2"><button className="btn-secondary text-xs" type="button" onClick={() => setCustomItemOpen((v) => !v)}><Plus size={14} /> Add Custom Item</button><button className="btn-ghost text-xs" onClick={addConsumptionRow} disabled={data.rawMaterials.length === 0}><Plus size={14} /> Add Row</button></div>
            </div>
            {customItemOpen && (
              <div className="mb-3 p-4 rounded-lg border border-brand-200 bg-brand-50 space-y-3">
                <p className="text-sm font-semibold text-brand-800">Custom Item Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div><label className="label">Item Name</label><input className="input" value={customItem.name} onChange={(e) => setCustomItem((v) => ({ ...v, name: e.target.value }))} placeholder="e.g. Custom Tag" /></div>
                  <div><label className="label">Category</label><select className="input" value={customItem.category} onChange={(e) => setCustomItem((v) => ({ ...v, category: e.target.value as MaterialCategory }))}>{ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="label">Unit</label><select className="input" value={customItem.unit} onChange={(e) => setCustomItem((v) => ({ ...v, unit: e.target.value as Unit }))}>{['KG','Meter','PCS','Pair','Roll','Packet','GSM','Litre','Box'].map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
                  <div><label className="label">Rate (₹)</label><input type="number" min="0" step="0.0001" className="input" value={customItem.rate} onChange={(e) => setCustomItem((v) => ({ ...v, rate: Number(e.target.value) || 0 }))} /></div>
                </div>
                <div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={() => setCustomItemOpen(false)}>Cancel</button><button className="btn-primary" type="button" onClick={() => { void createCustomItem(); }}>Add Item to Article</button></div>
              </div>
            )}
            {data.rawMaterials.length === 0 ? (
              <p className="text-sm text-warn-600 p-3 rounded-lg bg-warn-50">Add raw materials first to build a consumption sheet.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Material</th>
                      <th className="th text-right">Consumption</th>
                      <th className="th text-right">Rate (editable ₹)</th>
                      <th className="th text-right">Cost (₹)</th>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.consumptionSheet.map((row) => {
                      const mat = data.rawMaterials.find((m) => m.id === row.materialId);
                      const rate = row.unitRate ?? mat?.purchasePrice ?? 0;
                      const cost = row.consumption * rate;
                      return (
                        <tr key={row.id}>
                          <td className="td p-1">
                            <select className="input" value={row.materialId} onChange={(e) => updateConsumptionRow(row.id, 'materialId', e.target.value)}>
                              <option value="">Select material</option>
                              {data.rawMaterials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                            </select>
                            {mat && <p className="text-xs text-slate-400 mt-1 px-1">{mat.category} · ₹{formatNum(mat.purchasePrice, mat.purchasePrice < 1 ? 4 : 2)}/{mat.unit}</p>}
                          </td>
                          <td className="td p-1">
                            <input type="number" step="0.001" className="input text-right" value={row.consumption || ''} onChange={(e) => updateConsumptionRow(row.id, 'consumption', +e.target.value)} />
                          </td>
                          <td className="td p-1"><input type="number" min="0" step="0.0001" className="input text-right w-28" value={row.unitRate ?? mat?.purchasePrice ?? 0} onChange={(e) => updateConsumptionRow(row.id, 'unitRate', +e.target.value)} aria-label="Custom rate" /></td>
                          <td className="td text-right font-medium text-brand-700">₹{formatNum(cost, 2)}</td>
                          <td className="td p-1">
                            <button className="btn-ghost text-err-600" onClick={() => removeConsumptionRow(row.id)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {form.consumptionSheet.length === 0 && (
                      <tr><td colSpan={5} className="td text-center text-slate-400 py-6">No rows. Click "Add Row" to start.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {liveCostSummary && liveCostSummary.totalMaterialCost > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-brand-50 border border-brand-100">
                <h4 className="text-sm font-semibold text-brand-700 mb-3 flex items-center gap-2"><IndianRupee size={16} /> Live Cost Summary (Per Piece)</h4>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm mb-3">
                  {liveCostSummary.byCategory.filter((c) => c.total > 0).map((c) => (
                    <div key={c.category}>
                      <p className="text-xs text-slate-500">{c.category}</p>
                      <p className="font-bold text-slate-800">₹{formatNum(c.total, 2)}</p>
                    </div>
                  ))}
                  {liveCostSummary.byCategory.filter((c) => c.total === 0).map((c) => (
                    <div key={c.category}>
                      <p className="text-xs text-slate-400">{c.category}</p>
                      <p className="font-medium text-slate-400">₹0.00</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-brand-200 pt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><p className="font-semibold text-slate-700">Total Cost Per Piece</p><p className="font-bold text-slate-800">₹{formatNum(liveCostSummary.costPerPiece, 2)}</p></div>
                  <div className="flex items-center justify-between"><p className="font-semibold text-slate-600">GST @ 5%</p><p className="font-semibold text-slate-700">₹{formatNum(liveCostSummary.costPerPiece * 0.05, 2)}</p></div>
                  <div className="flex items-center justify-between rounded-md bg-white border border-brand-200 p-3"><p className="font-bold text-brand-700">Final Cost Per Piece (Including 5% GST)</p><p className="text-xl font-bold text-brand-700">₹{formatNum(liveCostSummary.costPerPiece * 1.05, 2)}</p></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Article?" message="This will cascade-delete all lots and downstream production records for this article."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />

      <Modal open={!!historyArticle} onClose={() => setHistoryArticle(null)} title={`History — ${historyArticle?.code ?? ''}`} size="md">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Article Versions</p>
          {data.articles.filter((a) => (a.baseArticleId || a.id) === (historyArticle?.baseArticleId || historyArticle?.id)).sort((a, b) => (b.versionNumber ?? 1) - (a.versionNumber ?? 1)).map((version) => (
            <div key={version.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
              <div><p className="text-sm font-medium text-slate-800">{version.code} — V{version.versionNumber ?? 1}</p><p className="text-xs text-slate-500">{formatDate(version.createdAt)} · {version.consumptionSheet.length} materials</p></div>
              <span className={`badge ${version.isCurrent ? 'bg-accent-100 text-accent-700' : 'bg-slate-100 text-slate-600'}`}>{version.isCurrent ? 'Current' : 'Archived'}</span>
            </div>
          ))}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4">Change Log</p>
          {data.history.filter((h) => h.module === 'Article Master').length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No history recorded.</p>
          ) : (
            data.history.filter((h) => h.module === 'Article Master').map((h) => (
              <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <span className={`badge ${h.action === 'Create' ? 'bg-accent-100 text-accent-700' : h.action === 'Edit' ? 'bg-brand-100 text-brand-700' : 'bg-err-100 text-err-700'}`}>{h.action}</span>
                <div className="flex-1"><p className="text-sm text-slate-700">{h.description}</p><p className="text-xs text-slate-400">{formatDate(h.timestamp)}</p></div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
