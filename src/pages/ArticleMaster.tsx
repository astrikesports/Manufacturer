import { useState } from 'react';
import { Shirt, Plus, Edit2, Trash2, History, IndianRupee, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getArticleCostSummary } from '../store/costing';
import { uid, now, formatDate, formatNum } from '../utils/helpers';
import { ALL_SIZES } from '../types';
import type { Article, SizeConsumption, Size, ConsumptionRow } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export default function ArticleMaster() {
  const { data, saveArticle, deleteArticle: deleteArticleDb, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyArticle, setHistoryArticle] = useState<Article | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
    setForm({ code: article.code, name: article.name, fabricId: article.fabricId, consumption: clone(article.consumption), consumptionSheet: clone(article.consumptionSheet) });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.fabricId) { alert('Fill all required fields'); return; }
    const dup = data.articles.find((a) => a.code.toLowerCase() === form.code.toLowerCase() && a.id !== editId);
    if (dup) { alert('Article code already exists'); return; }

    if (editId) {
      const existing = data.articles.find((a) => a.id === editId)!;
      await saveArticle({ ...existing, code: form.code, name: form.name, fabricId: form.fabricId, consumption: form.consumption, consumptionSheet: form.consumptionSheet });
      addHistory('Article Master', 'Edit', `Updated article: ${form.code} - ${form.name}`);
    } else {
      const article: Article = { id: '', code: form.code, name: form.name, fabricId: form.fabricId, consumption: form.consumption, consumptionSheet: form.consumptionSheet, createdAt: now() };
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

  const setSizeConsumption = (size: Size, val: number) => {
    setForm((f) => ({ ...f, consumption: f.consumption.map((c) => c.size === size ? { ...c, consumption: val } : c) }));
  };

  const addConsumptionRow = () => {
    const firstMat = data.rawMaterials[0];
    setForm((f) => ({ ...f, consumptionSheet: [...f.consumptionSheet, { id: uid(), materialId: firstMat?.id ?? '', consumption: 0 }] }));
  };

  const removeConsumptionRow = (rowId: string) => {
    setForm((f) => ({ ...f, consumptionSheet: f.consumptionSheet.filter((r) => r.id !== rowId) }));
  };

  const updateConsumptionRow = (rowId: string, field: 'materialId' | 'consumption', val: string | number) => {
    setForm((f) => ({
      ...f,
      consumptionSheet: f.consumptionSheet.map((r) => {
        if (r.id !== rowId) return r;
        if (field === 'materialId') return { ...r, materialId: val as string };
        return { ...r, consumption: val as number };
      }),
    }));
  };

  const fabricName = (id: string) => data.fabrics.find((f) => f.id === id)?.name ?? '—';

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

      {data.articles.length === 0 ? (
        <EmptyState icon={<Shirt size={40} />} title="No articles yet" message="Create an article with a consumption sheet to enable auto costing."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={18} /> Add Article</button>} />
      ) : (
        <div className="space-y-3">
          {data.articles.map((article) => {
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
                        <p className="text-xs text-slate-500">Cost Per Piece</p>
                        <p className="font-bold text-brand-700">₹{formatNum(summary.costPerPiece, 2)}</p>
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
                            const rate = mat?.purchasePrice ?? 0;
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
            <label className="label">Select Sizes & Fabric Consumption</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_SIZES.map((size) => {
                const selected = form.consumption.find((c) => c.size === size);
                return (
                  <div key={size} className={`p-3 rounded-lg border-2 transition ${selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!selected} onChange={() => toggleSize(size)} className="rounded" />
                      <span className="text-sm font-medium text-slate-700">{size}</span>
                    </label>
                    {selected && (
                      <input type="number" step="0.01" className="input mt-2" placeholder="Fabric consumption" value={selected.consumption || ''}
                        onChange={(e) => setSizeConsumption(size, +e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">Only selected sizes flow through the production pipeline.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Consumption Sheet</label>
              <button className="btn-ghost text-xs" onClick={addConsumptionRow} disabled={data.rawMaterials.length === 0}><Plus size={14} /> Add Row</button>
            </div>
            {data.rawMaterials.length === 0 ? (
              <p className="text-sm text-warn-600 p-3 rounded-lg bg-warn-50">Add raw materials first to build a consumption sheet.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Material</th>
                      <th className="th text-right">Consumption</th>
                      <th className="th text-right">Rate (auto)</th>
                      <th className="th text-right">Cost (₹)</th>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.consumptionSheet.map((row) => {
                      const mat = data.rawMaterials.find((m) => m.id === row.materialId);
                      const rate = mat?.purchasePrice ?? 0;
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
                          <td className="td text-right text-slate-500">₹{formatNum(mat?.purchasePrice ?? 0, (mat?.purchasePrice ?? 0) < 1 ? 4 : 2)}</td>
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
                <div className="border-t border-brand-200 pt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand-700">Total Cost Per Piece</p>
                  <p className="text-xl font-bold text-brand-700">₹{formatNum(liveCostSummary.costPerPiece, 2)}</p>
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
