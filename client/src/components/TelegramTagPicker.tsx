import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { AtSign, Check, Sparkles, ChevronDown, ChevronUp, X, Users } from 'lucide-react';

export const PRESET_TELEGRAM_TAGS = [
  '@badboiz123',
  '@Ziang_jee',
  '@muhahaahaa',
  '@Chienpv109',
  '@Phthaoo1204',
  '@TruongThangRV',
  '@TDisokay',
  '@manhhcr7',
  '@dungnaba',
  '@Thanh_Xuan9725',
  '@mmmmmybm',
];

interface TelegramTagPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
}

export const TelegramTagPicker: React.FC<TelegramTagPickerProps> = ({
  value,
  onChange,
  label = 'Tag Telegram (@username)',
  placeholder = '@badboiz123 @Ziang_jee...',
  helperText = 'Nhấp vào từng người để tag hoặc bấm "Tag Tất Cả" để thông báo cho toàn bộ đội ngũ.',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isExpanded, setIsExpanded] = useState(true);

  // Phân tích danh sách các tag đang có trong value
  const selectedTags = value
    ? value
        .trim()
        .split(/[\s,]+/)
        .map((t) => (t.startsWith('@') ? t : `@${t}`))
        .filter(Boolean)
    : [];

  const isAllSelected =
    PRESET_TELEGRAM_TAGS.every((tag) => selectedTags.includes(tag)) ||
    selectedTags.includes('@all');

  const toggleTag = (tag: string) => {
    let newTags: string[];
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter((t) => t !== tag && t !== '@all');
    } else {
      newTags = [...selectedTags.filter((t) => t !== '@all'), tag];
    }
    onChange(newTags.join(' '));
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange('');
    } else {
      onChange(PRESET_TELEGRAM_TAGS.join(' '));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      {/* Label and Quick Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          {label}
        </label>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 cursor-pointer ${
              isAllSelected
                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                : isLight
                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                : 'bg-sky-500/15 text-sky-300 border-sky-500/30 hover:bg-sky-500/25'
            }`}
          >
            <Users className="w-3 h-3" />
            {isAllSelected ? 'Đã Chọn Tất Cả (11)' : '✨ Tag Tất Cả'}
          </button>

          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-1 rounded-lg text-[10px] border transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-slate-200' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-slate-800'
              }`}
              title="Xóa tất cả tag"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1 cursor-pointer ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <span>{isExpanded ? 'Thu gọn' : 'Mở danh sách'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Manual Input with Icon */}
      <div className="relative">
        <AtSign className="w-4 h-4 text-sky-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:border-sky-500 transition ${
            isLight
              ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-sky-300 placeholder-slate-500'
          }`}
        />
      </div>

      {/* Tag Chips Picker Grid */}
      {isExpanded && (
        <div
          className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Sparkles className="w-3 h-3 text-amber-500" /> Danh Sách Tag Thành Viên (@username):
            </span>
            <span className="text-[10px] text-slate-400">
              Đã chọn: <strong className="text-sky-500 font-bold">{selectedTags.length}</strong>/{PRESET_TELEGRAM_TAGS.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_TELEGRAM_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag) || selectedTags.includes('@all');
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                    isSelected
                      ? isLight
                        ? 'bg-sky-500 text-white border-sky-600 shadow-sm shadow-sky-500/20'
                        : 'bg-sky-600 text-white border-sky-500 shadow-sm shadow-sky-600/30'
                      : isLight
                      ? 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-sky-500/50 hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? <Check className="w-3 h-3 text-white" /> : <AtSign className="w-3 h-3 opacity-40" />}
                  <span>{tag.replace(/^@/, '')}</span>
                </button>
              );
            })}
          </div>

          {helperText && (
            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200 dark:border-slate-800/60">
              💡 {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
