import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'indigo';
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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const colorMapDark = {
    blue: {
      bg: 'from-blue-600/15 via-blue-950/20 to-slate-900/60',
      border: 'border-blue-500/25 hover:border-blue-500/50',
      glow: 'from-blue-500/20 to-transparent',
      iconBg: 'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30',
      accent: 'text-blue-400',
    },
    emerald: {
      bg: 'from-emerald-600/15 via-emerald-950/20 to-slate-900/60',
      border: 'border-emerald-500/25 hover:border-emerald-500/50',
      glow: 'from-emerald-500/20 to-transparent',
      iconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30',
      accent: 'text-emerald-400',
    },
    amber: {
      bg: 'from-amber-600/15 via-amber-950/20 to-slate-900/60',
      border: 'border-amber-500/25 hover:border-amber-500/50',
      glow: 'from-amber-500/20 to-transparent',
      iconBg: 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/30',
      accent: 'text-amber-400',
    },
    purple: {
      bg: 'from-purple-600/15 via-purple-950/20 to-slate-900/60',
      border: 'border-purple-500/25 hover:border-purple-500/50',
      glow: 'from-purple-500/20 to-transparent',
      iconBg: 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30',
      accent: 'text-purple-400',
    },
    indigo: {
      bg: 'from-indigo-600/15 via-indigo-950/20 to-slate-900/60',
      border: 'border-indigo-500/25 hover:border-indigo-500/50',
      glow: 'from-indigo-500/20 to-transparent',
      iconBg: 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30',
      accent: 'text-indigo-400',
    },
    rose: {
      bg: 'from-rose-600/15 via-rose-950/20 to-slate-900/60',
      border: 'border-rose-500/25 hover:border-rose-500/50',
      glow: 'from-rose-500/20 to-transparent',
      iconBg: 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-500/30',
      accent: 'text-rose-400',
    },
  };

  const colorMapLight = {
    blue: {
      bg: 'from-blue-50/80 via-white to-slate-50',
      border: 'border-blue-200/80 hover:border-blue-400',
      glow: 'from-blue-200/30 to-transparent',
      iconBg: 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25',
      accent: 'text-blue-600',
    },
    emerald: {
      bg: 'from-emerald-50/80 via-white to-slate-50',
      border: 'border-emerald-200/80 hover:border-emerald-400',
      glow: 'from-emerald-200/30 to-transparent',
      iconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25',
      accent: 'text-emerald-600',
    },
    amber: {
      bg: 'from-amber-50/80 via-white to-slate-50',
      border: 'border-amber-200/80 hover:border-amber-400',
      glow: 'from-amber-200/30 to-transparent',
      iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
      accent: 'text-amber-600',
    },
    purple: {
      bg: 'from-purple-50/80 via-white to-slate-50',
      border: 'border-purple-200/80 hover:border-purple-400',
      glow: 'from-purple-200/30 to-transparent',
      iconBg: 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25',
      accent: 'text-purple-600',
    },
    indigo: {
      bg: 'from-indigo-50/80 via-white to-slate-50',
      border: 'border-indigo-200/80 hover:border-indigo-400',
      glow: 'from-indigo-200/30 to-transparent',
      iconBg: 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/25',
      accent: 'text-indigo-600',
    },
    rose: {
      bg: 'from-rose-50/80 via-white to-slate-50',
      border: 'border-rose-200/80 hover:border-rose-400',
      glow: 'from-rose-200/30 to-transparent',
      iconBg: 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-500/25',
      accent: 'text-rose-600',
    },
  };

  const scheme = isLight ? (colorMapLight[color] || colorMapLight.blue) : (colorMapDark[color] || colorMapDark.blue);

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br ${scheme.bg} border ${scheme.border} backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isLight ? 'shadow-md shadow-slate-200/60' : 'shadow-2xl shadow-black/40'
      }`}
    >
      {/* Corner subtle glow gradient */}
      <div
        className={`absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br ${scheme.glow} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500`}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1.5 flex-1 pr-2">
          <p className={`text-xs uppercase tracking-wider font-extrabold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {title}
          </p>
          <h4 className={`text-2xl xl:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {value}
          </h4>

          {subtitle && (
            <p className={`text-xs flex items-center gap-1.5 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {subtitle}
            </p>
          )}

          {trend && (
            <div className="pt-1">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  trendPositive
                    ? isLight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : isLight
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {trend}
              </span>
            </div>
          )}
        </div>

        <div className={`p-3.5 rounded-2xl ${scheme.iconBg} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
