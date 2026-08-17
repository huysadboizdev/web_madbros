import React from 'react';
import { MeetingsPage } from '../pages/MeetingsPage';
import { useTheme } from '../context/ThemeContext';

export const AdminMeetingsPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      <div
        className={`p-4 rounded-3xl border flex items-center justify-between gap-4 transition-all ${
          isLight
            ? 'bg-gradient-to-r from-purple-100/90 via-indigo-50 to-white border-purple-200/90 shadow-md text-purple-950'
            : 'bg-purple-950/40 border-purple-500/40 text-white shadow-xl'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
              isLight
                ? 'bg-purple-200 border-purple-300 text-purple-800 shadow-sm'
                : 'bg-purple-600/30 border-purple-500/40 text-purple-400'
            }`}
          >
            📅
          </div>
          <div>
            <h3 className={`text-sm sm:text-base font-extrabold ${isLight ? 'text-purple-950' : 'text-white'}`}>
              Chế Độ Quản Trị Cấp Cao: Lịch Họp & Kế Hoạch Đội Ngũ
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>
              Bạn có quyền tạo cuộc họp khẩn cấp toàn công ty, dời lịch, hủy họp và giám sát điểm danh người tham gia.
            </p>
          </div>
        </div>
      </div>

      <MeetingsPage />
    </div>
  );
};
