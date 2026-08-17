import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`relative p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-sm ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-700/80 text-amber-400 hover:bg-slate-800 hover:text-amber-300 hover:scale-105'
          : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200 hover:text-indigo-700 hover:scale-105'
      } ${className}`}
      title={theme === 'dark' ? 'Chuyển sang Chế Độ Sáng (Light Mode)' : 'Chuyển sang Chế Độ Tối (Dark Mode)'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-90" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};
