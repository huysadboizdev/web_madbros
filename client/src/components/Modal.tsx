import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog content */}
      <div
        className={`relative w-full ${maxWidth} rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
            : 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-slate-800/60 border-slate-800 text-white'
          }`}
        >
          <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
