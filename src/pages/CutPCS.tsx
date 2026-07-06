import { useState } from 'react';
import { Grid3x3, Edit2, Trash2, Package } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { CutPcsEntry } from '../types';
import { formatDate, formatNum } from '../utils/helpers';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

export default function CutPCS() {
  const { data, saveCutPcsEntry, deleteCutPcsEntry, addHistory } = useStore();
  const [editEntry, setEditEntry] = useState<CutPcsEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ leftPcs: 0, status: 'Available' as CutPcsEntry['status'], date: '' });

  const articleName = (lotId: string) => {
    const lot = data.lots.find((l) => l.id === lotId);
    return data.articles.find((a) => a.id === lot?.articleId)?.name ?? '—';
  };
  const lotNo = (lotId: string) => data.lots.find((l) => l.id === lotId)?.lotNo ?? '—';

  const openEdit = (entry: CutPcsEntry) => {
    setEditEntry(entry);
    setEditForm({ leftPcs: entry.leftPcs, status: entry.status, date: entry.date });
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    if (editForm.leftPcs < 0) { alert('Left PCS cannot be negative'); return; }
    await saveCutPcsEntry({ ...editEntry, leftPcs: editForm.leftPcs, status: editForm.status, date: editForm.date });
    addHistory('Cut PCS', 'Edit', `Updated Cut PCS for lot ${lotNo(editEntry.lotId)}: ${editEntry.size} = ${editForm.leftPcs} PCS`);
    setEditEntry(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const entry = data.cutPcsEntries.find((c) => c.id === deleteId);
    await deleteCutPcsEntry(deleteId);
    if (entry) addHistory('Cut PCS', 'Delete', `Deleted Cut PCS for lot ${lotNo(entry.lotId)}`);
    setDeleteId(null);
  };

  const lotsWithCutPcs = data.lots
    .map((lot) => ({ lot, entries: data.cutPcsEntries.filter((c) => c.lotId === lot.id) }))
    .filter((g) => g.entries.length > 0);

  return (
    <div>
      <PageHeader
        title="Cut PCS"
        subtitle="Leftover pieces after packing — pressing minus packed, per size"
        icon={<Grid3x3 size={22} />}
      />

      {lotsWithCutPcs.length === 0 ? (
        <EmptyState
          icon={<Grid3x3 size={40} />}
          title="No leftover pieces"
          message="Cut PCS are auto-generated when packing is saved. Save a packing entry to see leftovers here."
        />
      ) : (
        <div className="space-y-4">
          {lotsWithCutPcs.map(({ lot, entries }) => {
            const totalLeft = entries.reduce((a, e) => a + e.leftPcs, 0);
            const available = entries.filter((e) => e.status === 'Available').reduce((a, e) => a + e.leftPcs, 0);
            const article = articleName(lot.id);

            return (
              <div key={lot.id} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{lot.lotNo}</h3>
                    <p className="text-xs text-slate-500">{article}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-500">Total Left: <strong className="text-slate-800">{formatNum(totalLeft)}</strong></span>
                    <span className="text-slate-500">Available: <strong className={available > 0 ? 'text-warn-600' : 'text-accent-600'}>{formatNum(available)}</strong></span>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Size</th>
                        <th className="th text-right">Left PCS</th>
                        <th className="th">Date</th>
                        <th className="th">Status</th>
                        <th className="th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="td font-medium">{entry.size}</td>
                          <td className="td text-right">
                            <span className={`font-semibold ${entry.leftPcs > 0 ? 'text-warn-700' : 'text-slate-400'}`}>
                              {formatNum(entry.leftPcs)}
                            </span>
                          </td>
                          <td className="td text-slate-600">{formatDate(entry.date)}</td>
                          <td className="td">
                            <span className={`badge ${entry.status === 'Available' ? 'bg-warn-100 text-warn-700' : 'bg-slate-100 text-slate-500'}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="td text-right">
                            <div className="flex justify-end gap-1">
                              <button className="btn-ghost" onClick={() => openEdit(entry)}><Edit2 size={16} /></button>
                              <button className="btn-ghost text-err-600" onClick={() => setDeleteId(entry.id)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td className="td font-semibold">Total</td>
                        <td className="td text-right font-bold text-warn-700">{formatNum(totalLeft)}</td>
                        <td className="td" colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {available > 0 && (
                  <div className="px-5 py-3 bg-warn-50 border-t border-warn-100 flex items-center gap-2 text-sm text-warn-700">
                    <Package size={16} /> {formatNum(available)} pieces available — can be reallocated to another production run.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        title={`Edit Cut PCS — ${editEntry ? `${lotNo(editEntry.lotId)} / ${editEntry.size}` : ''}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditEntry(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveEdit}>Update</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Left PCS</label>
            <input
              type="number"
              min="0"
              className="input"
              value={editForm.leftPcs || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, leftPcs: +e.target.value || 0 }))}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={editForm.date}
              onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CutPcsEntry['status'] }))}>
              <option value="Available">Available</option>
              <option value="Used">Used</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Cut PCS Entry?"
        message="This removes the leftover PCS record. It will reappear automatically if you re-save the packing entry."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
