import { useState } from 'react';
import {
  LayoutDashboard, Package, Shirt, Layers, Scissors, Grid3x3,
  Sparkles, Wind, Box, Truck, FileBarChart, Settings as SettingsIcon,
  Menu, X, Factory, Boxes, Workflow,
} from 'lucide-react';

export type PageKey =
  | 'dashboard' | 'fabric' | 'rawmaterial' | 'article' | 'lot' | 'cutting' | 'cutpcs'
  | 'stitching' | 'finishing' | 'pressing' | 'packing' | 'dispatch' | 'reports' | 'settings';

interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, group: 'Overview' },
  { key: 'fabric', label: 'Fabric Stock', icon: <Package size={20} />, group: 'Inventory' },
  { key: 'rawmaterial', label: 'Raw Materials', icon: <Boxes size={20} />, group: 'Inventory' },
  { key: 'article', label: 'Article Master', icon: <Shirt size={20} />, group: 'Inventory' },
  { key: 'lot', label: 'Lot Creation', icon: <Layers size={20} />, group: 'Production' },
  { key: 'cutting', label: 'Cutting Entry', icon: <Scissors size={20} />, group: 'Production' },
  { key: 'cutpcs', label: 'Cut PCS', icon: <Grid3x3 size={20} />, group: 'Production' },
  { key: 'stitching', label: 'Stitching', icon: <Workflow size={20} />, group: 'Production' },
  { key: 'finishing', label: 'Finishing', icon: <Sparkles size={20} />, group: 'Production' },
  { key: 'pressing', label: 'Pressing', icon: <Wind size={20} />, group: 'Production' },
  { key: 'packing', label: 'Packing', icon: <Box size={20} />, group: 'Production' },
  { key: 'dispatch', label: 'Dispatch', icon: <Truck size={20} />, group: 'Production' },
  { key: 'reports', label: 'Reports', icon: <FileBarChart size={20} />, group: 'Insights' },
  { key: 'settings', label: 'Settings', icon: <SettingsIcon size={20} />, group: 'Insights' },
];

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  companyName: string;
}

export default function Sidebar({ current, onNavigate, companyName }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const groups = Array.from(new Set(navItems.map((n) => n.group)));

  const handleNav = (key: PageKey) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className={`h-full flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="p-2 rounded-xl bg-brand-600 text-white shrink-0">
          <Factory size={22} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">StitchFlow</h1>
            <p className="text-xs text-slate-400 truncate">{companyName}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {groups.map((group) => (
          <div key={group} className="mb-2">
            {!collapsed && (
              <p className="px-5 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group}</p>
            )}
            {navItems.filter((n) => n.group === group).map((item) => (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors ${
                  current === item.key
                    ? 'bg-brand-600 text-white border-r-2 border-brand-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-800 text-slate-400 hover:text-white text-xs"
      >
        {collapsed ? <Menu size={16} /> : <><X size={14} /> Collapse</>}
      </button>
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-900 text-white shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-60">{sidebarContent}</div>
        </div>
      )}

      <div className="hidden lg:block h-screen sticky top-0">{sidebarContent}</div>
    </>
  );
}
