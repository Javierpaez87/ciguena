import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  accent?: 'amber' | 'blue' | 'green' | 'red' | 'steel';
  subtitle?: string;
}

const accentMap = {
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  steel: 'text-steel-300 bg-steel-700/50 border-steel-600',
};

export default function MetricCard({ title, value, icon, change, changeType = 'neutral', accent = 'amber', subtitle }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg border ${accentMap[accent]}`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-medium ${changeType === 'positive' ? 'text-emerald-400' : changeType === 'negative' ? 'text-red-400' : 'text-steel-400'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-steel-50 mb-1">{value}</div>
      <div className="text-sm text-steel-400">{title}</div>
      {subtitle && <div className="text-xs text-steel-500 mt-1">{subtitle}</div>}
    </div>
  );
}
