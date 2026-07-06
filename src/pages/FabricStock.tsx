import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, History, Layers, IndianRupee, PlusCircle } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { getFabricBalance } from '../store/calculations';
import { getFabricPrice } from '../store/costing';
import { uid, now, formatNum, formatDate } from '../utils/helpers';
import type { Fabric, FabricColor, Unit } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

interface AddStockTarget {
  fabric: Fabric;
  color: FabricColor;
}

export default function FabricStock() {
  const { data, saveFabric, deleteFabric: deleteFabricDb, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyFabric, setHistoryFabric] = useState<Fabric | null>(null);
  const [addStockTarget, setAddStockTarget] = useState<AddStockTarget | null>(null);
  const [addStockForm, setAddStockForm] = useState({ rolls: 0, stock: 0 });

  const [form, setForm] = useState<{ name: string; unit: Unit; colors: Omit<FabricColor, 'id'>[] }>({
    name: '',
    unit: 'KG',
    colors: [{ name: '', rolls: 0, stock: 0, used: 0 }],
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', unit: 'KG', colors: [{ name: '', rolls: 0, stock: 0, used: 0 }] });
    setModalOpen(true);
  };

  const openEdit = (fabric: Fabric) => {
    setEditId(fabric.id);
    setForm({
      name: fabric.name,
      unit: fabric.unit,
      colors: fabric.colors.map((c) => ({ name: c.name, rolls: c.rolls, stock: c.stock, used: c.used })),
    });
    setModalOpen(true);
  };

  const openAddStock = (fabric: Fabric, color: FabricColor) => {
    setAddStockTarget({ fabric, color });
    setAddStockForm({ rolls: 0, stock: 0 });
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const rawColors = form.colors.filter((c) => c.name.trim());

    if (editId) {
      const existing = data.fabrics.find((f) => f.id === editId)!;
      const newColors: FabricColor[] = rawColors.map((nc) => {
        const found = existing.colors.find((ec) => ec.name.toLowerCase() === nc.name.toLowerCase());
        return found ? { ...nc, id: found.id } : { ...nc, id: uid('c_') };
      });
      await saveFabric({ ...existing, name: form.name, unit: form.unit, colors: newColors });
      addHistory('Fabric Stock', 'Edit', `Updated fabric: ${form.name}`);
    } else {
      const colors: FabricColor[] = rawColors.map((c) => ({ ...c, id: uid('c_') }));
      const fabric: Fabric = { name: form.name, unit: form.unit, colors, createdAt: now() };
      await saveFabric(fabric);
      addHistory('Fabric Stock', 'Create', `Created fabric: ${form.name} with ${colors.length} colors`);
    }
    setModalOpen(false);
  };

  const saveAddStock = async () => {
    if (!addStockTarget) return;
    if (addStockForm.rolls < 0 || addStockForm.stock < 0) { alert('Values cannot be negative'); return; }
    const { fabric, color } = addStockTarget;
    const updatedColors = fabric.colors.map((c) =>
      c.id === color.id
        ? { ...c, rolls: c.rolls + addStockForm.rolls, stock: c.stock + addStockForm.stock }
        : c
    );
    await saveFabric({ ...fabric, colors: updatedColors });
    addHistory('Fabric Stock', 'Edit', `Added stock to ${fabric.name} / ${color.name}: +${addStockForm.rolls} rolls, +${addStockForm.stock} ${fabric.unit}`);
    setAddStockTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const fabric = data.fabrics.find((f) => f.id === deleteId);
    await deleteFabricDb(deleteId);
    addHistory('Fabric Stock', 'Delete', `Deleted fabric: ${fabric?.name}`);
    setDeleteId(null);
  };

  const addColorRow = () => setForm((f) => ({ ...f, colors: [...f.colors, { name: '', rolls: 0, stock: 0, used: 0 }] }));
  const removeColorRow = (i: number) => setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <PageHeader
        title="Fabric Stock"
        subtitle="Manage fabric inventory — prices are fetched from Raw Material Master"
        icon={<Package size={22} />}
        action={{ label: 'Add Fabric', onClick: openCreate }}
      />

      {data.fabrics.length === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title="No fabrics yet"
          message="Add your first fabric with colors and stock to begin production planning."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={18} /> Add Fabric</button>}
        />
      ) : (
        <div className="space-y-4">
          {data.fabrics.map((fabric) => (
            <div key={fabric.id} className="card overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-600"><Layers size={20} /></div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{fabric.name}</h3>
                    <p className="text-xs text-slate-500">Unit: {fabric.unit} · {fabric.colors.length} colors · Added {formatDate(fabric.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {(() => {
                    const price = getFabricPrice(data, fabric.name);
                    return price !== undefined ? (
                      <div className="text-right">
                        <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><IndianRupee size={12} /> Price (from Raw Material)</p>
                        <p className="text-lg font-bold text-brand-700">₹{formatNum(price, price < 1 ? 4 : 2)} <span className="text-xs font-normal text-slate-500">/{fabric.unit}</span></p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-xs text-warn-500">No price set</p>
                        <p className="text-xs text-slate-400">Add in Raw Material Master</p>
                      </div>
                    );
                  })()}
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={() => setHistoryFabric(fabric)} title="History"><History size={16} /></button>
                    <button className="btn-secondary" onClick={() => openEdit(fabric)}><Edit2 size={16} /> Edit</button>
                    <button className="btn-danger" onClick={() => setDeleteId(fabric.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Color</th>
                      <th className="th text-right">Rolls</th>
                      <th className="th text-right">Stock ({fabric.unit})</th>
                      <th className="th text-right">Used ({fabric.unit})</th>
                      <th className="th text-right">Balance ({fabric.unit})</th>
                      <th className="th text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fabric.colors.map((color) => {
                      const balance = getFabricBalance(color);
                      return (
                        <tr key={color.id} className="hover:bg-slate-50">
                          <td className="td">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-brand-400" />
                              {color.name}
                            </span>
                          </td>
                          <td className="td text-right">{formatNum(color.rolls)}</td>
                          <td className="td text-right font-medium">{formatNum(color.stock, 2)}</td>
                          <td className="td text-right text-warn-600">{formatNum(color.used, 2)}</td>
                          <td className="td text-right">
                            <span className={`badge ${balance > 0 ? 'bg-accent-100 text-accent-700' : 'bg-err-100 text-err-700'}`}>
                              {formatNum(balance, 2)}
                            </span>
                          </td>
                          <td className="td text-right">
                            <button
                              className="btn-ghost text-accent-600 text-xs flex items-center gap-1"
                              onClick={() => openAddStock(fabric, color)}
                              title="Add stock rolls"
                            >
                              <PlusCircle size={15} /> Add Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Fabric Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Fabric' : 'Add Fabric'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fabric Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Dot Knit" />
            </div>
            <div>
              <label className="label">Unit (locked after creation)</label>
              <select className="input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as Unit }))} disabled={!!editId}>
                <option value="KG">KG</option>
                <option value="Meter">Meter</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Colors</label>
              <button className="btn-ghost text-xs" onClick={addColorRow}><Plus size={14} /> Add Color</button>
            </div>
            <div className="space-y-2">
              {form.colors.map((color, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input className="input" placeholder="Color name" value={color.name}
                      onChange={(e) => setForm((f) => { const c = [...f.colors]; c[i] = { ...c[i], name: e.target.value }; return { ...f, colors: c }; })} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" className="input" placeholder="Rolls" value={color.rolls || ''}
                      onChange={(e) => setForm((f) => { const c = [...f.colors]; c[i] = { ...c[i], rolls: +e.target.value }; return { ...f, colors: c }; })} />
                  </div>
                  <div className="col-span-4">
                    <input type="number" className="input" placeholder={`Stock (${form.unit})`} value={color.stock || ''}
                      onChange={(e) => setForm((f) => { const c = [...f.colors]; c[i] = { ...c[i], stock: +e.target.value }; return { ...f, colors: c }; })} />
                  </div>
                  <div className="col-span-1">
                    <button className="btn-ghost text-err-600" onClick={() => removeColorRow(i)} disabled={form.colors.length === 1}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">One fabric record holds multiple colors. Stock flows through all production stages in {form.unit}. Price is auto-fetched from Raw Material Master — never set here.</p>
          </div>
        </div>
      </Modal>

      {/* Add Stock Modal */}
      <Modal
        open={!!addStockTarget}
        onClose={() => setAddStockTarget(null)}
        title={`Add Stock — ${addStockTarget?.fabric.name} / ${addStockTarget?.color.name}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAddStockTarget(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveAddStock}>Add Stock</button>
          </>
        }
      >
        {addStockTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 text-sm grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-500">Current Rolls</p>
                <p className="font-bold text-slate-800">{formatNum(addStockTarget.color.rolls)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Current Stock</p>
                <p className="font-bold text-slate-800">{formatNum(addStockTarget.color.stock, 2)} {addStockTarget.fabric.unit}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Balance</p>
                <p className={`font-bold ${getFabricBalance(addStockTarget.color) > 0 ? 'text-accent-700' : 'text-err-700'}`}>
                  {formatNum(getFabricBalance(addStockTarget.color), 2)}
                </p>
              </div>
            </div>
            <div>
              <label className="label">Rolls to Add</label>
              <input
                type="number"
                min="0"
                className="input"
                value={addStockForm.rolls || ''}
                onChange={(e) => setAddStockForm((f) => ({ ...f, rolls: +e.target.value || 0 }))}
              />
            </div>
            <div>
              <label className="label">Stock to Add ({addStockTarget.fabric.unit})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={addStockForm.stock || ''}
                onChange={(e) => setAddStockForm((f) => ({ ...f, stock: +e.target.value || 0 }))}
              />
            </div>
            <p className="text-xs text-slate-400">This will be added to existing stock. Use Edit Fabric to fully reset values.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Fabric?"
        message="This will permanently delete the fabric, its colors, and cascade-delete all related lots, cuttings, packings and dispatches. Fabric stock will be restored."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Modal open={!!historyFabric} onClose={() => setHistoryFabric(null)} title={`History — ${historyFabric?.name ?? ''}`} size="md">
        <div className="space-y-2">
          {data.history.filter((h) => h.module === 'Fabric Stock').length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No history recorded.</p>
          ) : (
            data.history.filter((h) => h.module === 'Fabric Stock').map((h) => (
              <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <span className={`badge ${h.action === 'Create' ? 'bg-accent-100 text-accent-700' : h.action === 'Edit' ? 'bg-brand-100 text-brand-700' : 'bg-err-100 text-err-700'}`}>{h.action}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-700">{h.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(h.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
