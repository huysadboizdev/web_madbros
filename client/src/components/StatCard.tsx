import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive,
  color = 'blue',
}) => {
  const colorMap = {
    blue: {
      bg: 'from-blue-500/10 to-indigo-500/5',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/20 text-blue-400',
      accent: 'text-blue-400',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-teal-500/5',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      accent: 'text-emerald-400',
    },
    amber: {
      bg: 'from-amber-500/10 to-orange-500/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400',
      accent: 'text-amber-400',
    },
    purple: {
      bg: 'from-purple-500/10 to-pink-500/5',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-400',
      accent: 'text-purple-400',
    },
    rose: {
      bg: 'from-rose-500/10 to-red-500/5',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-400',
      accent: 'text-rose-400',
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${scheme.bg} border ${scheme.border} backdrop-blur-sm transition-all hover:scale-[1.01] hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h4 className="mt-2 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {value}
          </h4>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
          {trend && (
            <span
              className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                trendPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        <div className={`p-3.5 rounded-xl ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
