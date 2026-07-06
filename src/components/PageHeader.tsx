import { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
}

export default function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        {icon && <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">{icon}</div>}
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button className="btn-primary" onClick={action.onClick}>
          <Plus size={18} /> {action.label}
        </button>
      )}
    </div>
  );
}
