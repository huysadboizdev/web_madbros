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
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog content - Bottom Sheet on mobile, Centered Modal on tablet/desktop */}
      <div
        className={`relative w-full ${maxWidth} rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 border-t sm:border transition-all max-h-[92vh] sm:max-h-[88vh] flex flex-col ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-400/40'
            : 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-black/90'
        }`}
      >
        {/* Mobile Drag/Grab Bar Indicator */}
        <div className="sm:hidden w-full flex justify-center pt-2 pb-1 cursor-grab">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header (Sticky) */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b shrink-0 ${
            isLight
              ? 'bg-slate-50/90 border-slate-200 text-slate-900'
              : 'bg-slate-800/80 border-slate-800 text-white'
          }`}
        >
          <h3 className={`text-base sm:text-lg font-bold truncate pr-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable with iOS/Android touch momentum) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain safe-area-bottom">
          {children}
        </div>
      </div>
    </div>
  );
};
