import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, ArrowDownToLine, ArrowUpFromLine, RefreshCw, RotateCcw, TrendingUp, Search, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { uid, now, today, formatDate, formatNum } from '../utils/helpers';
import { ALL_CATEGORIES } from '../types';
import type { RawMaterial, RawMaterialTransaction, Unit, MaterialCategory } from '../types';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const ALL_UNITS: Unit[] = ['KG', 'Meter', 'PCS', 'Roll', 'Pair', 'Packet', 'Box'];

function formatPrice(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  const dp = n < 1 ? 4 : 2;
  return n.toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

const TX_TYPES: RawMaterialTransaction['type'][] = ['Opening', 'Purchase', 'Issue', 'Return', 'Adjustment'];

const txTypeStyle: Record<RawMaterialTransaction['type'], string> = {
  Opening: 'bg-slate-100 text-slate-700',
  Purchase: 'bg-accent-100 text-accent-700',
  Issue: 'bg-err-100 text-err-700',
  Return: 'bg-brand-100 text-brand-700',
  Adjustment: 'bg-warn-100 text-warn-700',
};

const txTypeSign = (type: RawMaterialTransaction['type']) => type === 'Issue' ? -1 : 1;

export default function RawMaterialMaster() {
  const { data, saveRawMaterial, deleteRawMaterial, saveRawMaterialTransaction, deleteRawMaterialTransaction, addHistory } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [txMaterial, setTxMaterial] = useState<RawMaterial | null>(null);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<MaterialCategory | 'All'>('All');

  const [form, setForm] = useState<Omit<RawMaterial, 'id' | 'createdAt' | 'currentStock'>>({
    name: '', category: 'Fabric', unit: 'KG', purchasePrice: 0, supplier: '', gst: 0,
    status: 'Active', remarks: '', openingStock: 0, minStock: 0,
  });

  const [txForm, setTxForm] = useState<{ type: RawMaterialTransaction['type']; qty: string; notes: string; date: string }>({
    type: 'Purchase', qty: '', notes: '', date: today(),
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', category: 'Fabric', unit: 'KG', purchasePrice: 0, supplier: '', gst: 0, status: 'Active', remarks: '', openingStock: 0, minStock: 0 });
    setModalOpen(true);
  };

  const openEdit = (item: RawMaterial) => {
    setEditId(item.id);
    setForm({
      name: item.name, category: item.category, unit: item.unit,
      purchasePrice: item.purchasePrice, supplier: item.supplier, gst: item.gst,
      status: item.status, remarks: item.remarks ?? '',
      openingStock: item.openingStock ?? 0, minStock: item.minStock ?? 0,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert('Item name is required'); return; }
    if (editId) {
      const existing = data.rawMaterials.find((m) => m.id === editId)!;
      await saveRawMaterial({ ...existing, ...form });
      addHistory('Raw Material', 'Edit', `Updated material: ${form.name}`);
    } else {
      const item: RawMaterial = { id: '', ...form, currentStock: form.openingStock ?? 0, createdAt: now() };
      const savedItem = await saveRawMaterial(item);
      // Create opening stock transaction if provided
      if ((form.openingStock ?? 0) > 0) {
        const openingTx: RawMaterialTransaction = {
          id: uid('tx_'), materialId: savedItem.id, type: 'Opening',
          qty: form.openingStock ?? 0, notes: 'Opening stock', date: today(), createdAt: now(),
        };
        await saveRawMaterialTransaction(openingTx);
      }
      addHistory('Raw Material', 'Create', `Created material: ${form.name} (${form.category}) @ ₹${formatPrice(form.purchasePrice)}/${form.unit}`);
    }
    setModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const item = data.rawMaterials.find((m) => m.id === deleteId);
    await deleteRawMaterial(deleteId);
    addHistory('Raw Material', 'Delete', `Deleted material: ${item?.name}`);
    setDeleteId(null);
  };

  const openTxModal = (item: RawMaterial) => {
    setTxMaterial(item);
    setTxForm({ type: 'Purchase', qty: '', notes: '', date: today() });
    setTxModalOpen(true);
  };

  const saveTx = async () => {
    if (!txMaterial) return;
    const qty = parseFloat(txForm.qty);
    if (!qty || qty <= 0) { alert('Enter a valid quantity'); return; }
    const tx: RawMaterialTransaction = {
      id: uid('tx_'), materialId: txMaterial.id, type: txForm.type,
      qty, notes: txForm.notes, date: txForm.date, createdAt: now(),
    };
    await saveRawMaterialTransaction(tx);
    addHistory('Raw Material', 'Edit', `${txForm.type} of ${formatNum(qty)} ${txMaterial.unit} for ${txMaterial.name}`);
    setTxForm({ type: 'Purchase', qty: '', notes: '', date: today() });
  };

  const confirmDeleteTx = async () => {
    if (!deleteTxId) return;
    await deleteRawMaterialTransaction(deleteTxId);
    setDeleteTxId(null);
  };

  const filtered = data.rawMaterials.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.supplier.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || m.category === filterCat;
    return matchSearch && matchCat;
  });

  const catColor: Record<MaterialCategory, string> = {
    Fabric: 'bg-brand-100 text-brand-700',
    Thread: 'bg-accent-100 text-accent-700',
    Elastic: 'bg-accent-50 text-accent-600',
    Zip: 'bg-slate-100 text-slate-700',
    Button: 'bg-warn-100 text-warn-700',
    Label: 'bg-slate-100 text-slate-600',
    Rib: 'bg-brand-50 text-brand-600',
    Printing: 'bg-err-100 text-err-700',
    Packing: 'bg-warn-50 text-warn-600',
    Other: 'bg-slate-100 text-slate-500',
  };

  const txsForMaterial = txMaterial
    ? data.rawMaterialTransactions.filter((t) => t.materialId === txMaterial.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  const runningBalance = (() => {
    const sorted = [...txsForMaterial].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let bal = 0;
    return sorted.map((tx) => {
      bal += txTypeSign(tx.type) * tx.qty;
      return { id: tx.id, balance: bal };
    });
  })();

  const balanceMap = new Map(runningBalance.map((r) => [r.id, r.balance]));

  return (
    <div>
      <PageHeader title="Raw Material Master" subtitle="Manage all raw materials with transaction-based inventory tracking" icon={<Package size={22} />}
        action={{ label: 'Add Material', onClick: openCreate }} />

      {data.rawMaterials.length === 0 ? (
        <EmptyState icon={<Package size={40} />} title="No raw materials" message="Add fabric, thread, elastic, zip, buttons, labels, rib, poly bags, cartons and more."
          action={<button className="btn-primary" onClick={openCreate}><Plus size={18} /> Add Material</button>} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" placeholder="Search by name or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input sm:w-48" value={filterCat} onChange={(e) => setFilterCat(e.target.value as MaterialCategory | 'All')}>
              <option value="All">All Categories</option>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Item Name</th>
                    <th className="th">Category</th>
                    <th className="th">Unit</th>
                    <th className="th text-right">Price (₹)</th>
                    <th className="th text-right">GST%</th>
                    <th className="th text-right">Current Stock</th>
                    <th className="th text-right">Min Stock</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const isLow = item.minStock > 0 && item.currentStock < item.minStock;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="td font-medium text-slate-800">
                          {item.name}
                          {item.remarks && <p className="text-xs text-slate-400 mt-0.5">{item.remarks}</p>}
                        </td>
                        <td className="td"><span className={`badge ${catColor[item.category]}`}>{item.category}</span></td>
                        <td className="td text-slate-600">{item.unit}</td>
                        <td className="td text-right font-medium">₹{formatPrice(item.purchasePrice)}</td>
                        <td className="td text-right text-slate-600">{formatNum(item.gst)}%</td>
                        <td className="td text-right">
                          <span className={`font-semibold ${isLow ? 'text-err-600' : 'text-slate-800'}`}>
                            {formatNum(item.currentStock)}
                          </span>
                          {isLow && <AlertTriangle size={12} className="inline ml-1 text-err-500" />}
                        </td>
                        <td className="td text-right text-slate-500">{item.minStock > 0 ? formatNum(item.minStock) : '—'}</td>
                        <td className="td"><span className={`badge ${item.status === 'Active' ? 'bg-accent-100 text-accent-700' : 'bg-slate-100 text-slate-500'}`}>{item.status}</span></td>
                        <td className="td text-right">
                          <div className="flex justify-end gap-1">
                            <button className="btn-ghost text-brand-600" onClick={() => openTxModal(item)} title="Stock Transactions"><TrendingUp size={16} /></button>
                            <button className="btn-ghost" onClick={() => openEdit(item)}><Edit2 size={16} /></button>
                            <button className="btn-ghost text-err-600" onClick={() => setDeleteId(item.id)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Add/Edit Material Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Raw Material' : 'Add Raw Material'} size="md"
        footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={save}>{editId ? 'Update' : 'Create'}</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Item Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Dot Knit 220 GSM" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MaterialCategory }))}>
                {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as Unit }))}>
                {ALL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Purchase Price (₹)</label>
              <input type="number" step="0.0001" className="input" value={form.purchasePrice || ''} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 310.50" />
            </div>
            <div>
              <label className="label">Supplier</label>
              <input className="input" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
            </div>
            <div>
              <label className="label">GST (%)</label>
              <input type="number" step="0.01" className="input" value={form.gst || ''} onChange={(e) => setForm((f) => ({ ...f, gst: parseFloat(e.target.value) || 0 }))} />
            </div>
            {!editId && (
              <div>
                <label className="label">Opening Stock</label>
                <input type="number" step="0.01" className="input" value={form.openingStock || ''} onChange={(e) => setForm((f) => ({ ...f, openingStock: parseFloat(e.target.value) || 0 }))} placeholder="Current stock on hand" />
              </div>
            )}
            <div>
              <label className="label">Min Stock Alert</label>
              <input type="number" step="0.01" className="input" value={form.minStock || ''} onChange={(e) => setForm((f) => ({ ...f, minStock: parseFloat(e.target.value) || 0 }))} placeholder="Alert when below this" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Remarks</label>
              <input className="input" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Raw Material?" message="This removes the material and all its stock transactions. All article consumption sheets using this material will be affected."
        onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />

      {/* ── Stock Transactions Modal ── */}
      <Modal open={txModalOpen} onClose={() => setTxModalOpen(false)} title={`Stock Ledger — ${txMaterial?.name ?? ''}`} size="xl">
        {txMaterial && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Current Stock', value: `${formatNum(txMaterial.currentStock)} ${txMaterial.unit}`, color: txMaterial.minStock > 0 && txMaterial.currentStock < txMaterial.minStock ? 'bg-err-50 text-err-700' : 'bg-accent-50 text-accent-700' },
                { label: 'Purchase Price', value: `₹${formatPrice(txMaterial.purchasePrice)}/${txMaterial.unit}`, color: 'bg-slate-50 text-slate-700' },
                { label: 'Inventory Value', value: `₹${formatPrice(txMaterial.currentStock * txMaterial.purchasePrice)}`, color: 'bg-brand-50 text-brand-700' },
                { label: 'Min Stock Alert', value: txMaterial.minStock > 0 ? `${formatNum(txMaterial.minStock)} ${txMaterial.unit}` : 'Not set', color: 'bg-warn-50 text-warn-700' },
              ].map((card) => (
                <div key={card.label} className={`rounded-xl p-3 ${card.color}`}>
                  <p className="text-xs font-medium opacity-70">{card.label}</p>
                  <p className="text-sm font-bold mt-0.5">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Add Transaction form */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Transaction</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={txForm.type} onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value as RawMaterialTransaction['type'] }))}>
                    {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity ({txMaterial.unit})</label>
                  <input type="number" step="0.01" min="0" className="input" value={txForm.qty} onChange={(e) => setTxForm((f) => ({ ...f, qty: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" value={txForm.notes} onChange={(e) => setTxForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional note" />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button className="btn-primary" onClick={saveTx}>
                  {txForm.type === 'Purchase' && <ArrowDownToLine size={16} />}
                  {txForm.type === 'Issue' && <ArrowUpFromLine size={16} />}
                  {txForm.type === 'Return' && <RotateCcw size={16} />}
                  {txForm.type === 'Adjustment' && <RefreshCw size={16} />}
                  {txForm.type === 'Opening' && <ArrowDownToLine size={16} />}
                  Record {txForm.type}
                </button>
              </div>
            </div>

            {/* Transaction ledger */}
            {txsForMaterial.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No transactions recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Date</th>
                      <th className="th">Type</th>
                      <th className="th text-right">Quantity</th>
                      <th className="th text-right">Balance</th>
                      <th className="th">Notes</th>
                      <th className="th text-right">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {txsForMaterial.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="td">{formatDate(tx.date)}</td>
                        <td className="td"><span className={`badge ${txTypeStyle[tx.type]}`}>{tx.type}</span></td>
                        <td className={`td text-right font-medium ${tx.type === 'Issue' ? 'text-err-600' : 'text-accent-700'}`}>
                          {tx.type === 'Issue' ? '−' : '+'}{formatNum(tx.qty)} {txMaterial.unit}
                        </td>
                        <td className="td text-right text-slate-700 font-semibold">
                          {formatNum(balanceMap.get(tx.id) ?? 0)} {txMaterial.unit}
                        </td>
                        <td className="td text-slate-500">{tx.notes || '—'}</td>
                        <td className="td text-right">
                          <button className="btn-ghost text-err-600" onClick={() => setDeleteTxId(tx.id)}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTxId} title="Delete Transaction?" message="This will recompute the current stock balance."
        onConfirm={confirmDeleteTx} onCancel={() => setDeleteTxId(null)} />
    </div>
  );
}
