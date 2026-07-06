import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: 'brand' | 'accent' | 'warn' | 'err' | 'slate';
  sublabel?: string;
  trend?: number;
}

const colorMap = {
  brand: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-50 text-accent-600',
  warn: 'bg-warn-50 text-warn-600',
  err: 'bg-err-50 text-err-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatCard({ label, value, icon, color, sublabel, trend }: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>{icon}</div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3 text-xs">
          {trend >= 0 ? (
            <span className="text-accent-600 flex items-center gap-0.5"><TrendingUp size={14} /> +{trend}%</span>
          ) : (
            <span className="text-err-600 flex items-center gap-0.5"><TrendingDown size={14} /> {trend}%</span>
          )}
          <span className="text-slate-400">vs last period</span>
        </div>
      )}
    </div>
  );
}
