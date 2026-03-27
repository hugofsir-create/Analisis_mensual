import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}

export const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
    green: 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50',
    red: 'bg-rose-900/30 text-rose-400 border border-rose-800/50',
    amber: 'bg-amber-900/30 text-amber-400 border border-amber-800/50',
    purple: 'bg-violet-900/30 text-violet-400 border border-violet-800/50',
  };

  const textColors = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    red: 'text-rose-400',
    amber: 'text-amber-400',
    purple: 'text-violet-400',
  };

  const renderValue = (val: string | number) => {
    const strVal = String(val);
    if (strVal.includes('%')) {
      return (
        <span className="flex items-baseline">
          <span className="text-white">{strVal.replace('%', '')}</span>
          <span className={cn("ml-0.5 text-lg font-bold", textColors[color])}>%</span>
        </span>
      );
    }
    return val;
  };

  const renderDescription = (desc: string) => {
    const parts = desc.split(/(\d+(?:\.\d+)?%)/g);
    return parts.map((part, i) => 
      part.endsWith('%') 
        ? <span key={i} className={cn("font-bold", textColors[color])}>{part}</span>
        : part
    );
  };

  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white leading-none">
          {renderValue(value)}
        </h3>
        {description && (
          <p className="text-xs text-slate-500 mt-2">
            {renderDescription(description)}
          </p>
        )}
      </div>
    </div>
  );
};
