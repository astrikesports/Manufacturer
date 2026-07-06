import { useState } from 'react';
import { Settings as SettingsIcon, Save, Trash2, Database, Download, Upload } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { Unit } from '../types';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Settings() {
  const { data, saveSettings, addHistory, resetData, loadSampleData } = useStore();
  const [companyName, setCompanyName] = useState(data.settings.companyName);
  const [defaultUnit, setDefaultUnit] = useState<Unit>(data.settings.defaultUnit);
  const [showReset, setShowReset] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await saveSettings({ companyName, defaultUnit });
    addHistory('Settings', 'Edit', `Updated settings: company=${companyName}, unit=${defaultUnit}`);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stitchflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (_e: React.ChangeEvent<HTMLInputElement>) => {
    alert('Import is not available with Supabase backend. Please use the Settings page to load sample data instead.');
  };

  const stats = {
    fabrics: data.fabrics.length,
    articles: data.articles.length,
    lots: data.lots.length,
    cuttings: data.cuttings.length,
    finishings: data.finishings.length,
    pressings: data.pressings.length,
    packings: data.packings.length,
    dispatches: data.dispatches.length,
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure company, default unit and data management" icon={<SettingsIcon size={22} />} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Company Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="label">Default Unit (for new fabrics)</label>
              <select className="input" value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value as Unit)}>
                <option value="KG">KG</option>
                <option value="Meter">Meter</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Once a fabric is created, its unit is locked and flows through all stages without conversion.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={save}><Save size={16} /> Save Settings</button>
              {saved && <span className="text-sm text-accent-600 font-medium">Saved!</span>}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Database size={18} /> Data Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats).map(([key, val]) => (
              <div key={key} className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500 uppercase font-semibold">{key}</p>
                <p className="text-xl font-bold text-slate-800">{val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Data Management</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-700">Export Backup</p>
                <p className="text-xs text-slate-500">Download all data as JSON</p>
              </div>
              <button className="btn-secondary" onClick={exportData}><Download size={16} /> Export</button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-700">Import Backup</p>
                <p className="text-xs text-slate-500">Restore from JSON file</p>
              </div>
              <label className="btn-secondary cursor-pointer">
                <Upload size={16} /> Import
                <input type="file" accept=".json" className="hidden" onChange={importData} />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-700">Load Sample Data</p>
                <p className="text-xs text-slate-500">Populate with demo fabric, article and lot</p>
              </div>
              <button className="btn-secondary" onClick={loadSampleData}>Load</button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-err-50">
              <div>
                <p className="text-sm font-medium text-err-700">Reset All Data</p>
                <p className="text-xs text-err-500">Permanently delete everything</p>
              </div>
              <button className="btn-danger" onClick={() => setShowReset(true)}><Trash2 size={16} /> Reset</button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">About StitchFlow ERP</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            StitchFlow is a garment manufacturing ERP that follows the real production pipeline:
            Fabric Stock → Article Master → Lot Creation → Cutting → Finishing → Pressing → Packing → Dispatch.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            All data is stored in Supabase PostgreSQL. The architecture uses a normalized relational
            schema with RLS policies, views, and helper functions for production reporting.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge bg-brand-100 text-brand-700">React + TypeScript</span>
            <span className="badge bg-accent-100 text-accent-700">Vite</span>
            <span className="badge bg-slate-100 text-slate-700">Supabase PostgreSQL</span>
            <span className="badge bg-warn-100 text-warn-700">RLS Secured</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showReset}
        title="Reset All Data?"
        message="This permanently deletes all fabrics, articles, lots and production records. This cannot be undone."
        confirmLabel="Reset Everything"
        onConfirm={() => { resetData(); setShowReset(false); }}
        onCancel={() => setShowReset(false)}
      />
    </div>
  );
}
