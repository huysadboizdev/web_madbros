import React from 'react';
import { TasksPage } from '../pages/TasksPage';
import { useTheme } from '../context/ThemeContext';

export const AdminTasksPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      <div
        className={`p-4 rounded-3xl border flex items-center justify-between gap-4 transition-all ${
          isLight
            ? 'bg-gradient-to-r from-indigo-100/90 via-blue-50 to-white border-indigo-200/90 shadow-md text-indigo-950'
            : 'bg-indigo-950/40 border-indigo-500/40 text-white shadow-xl'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
              isLight
                ? 'bg-indigo-200 border-indigo-300 text-indigo-800 shadow-sm'
                : 'bg-indigo-600/30 border-indigo-500/40 text-indigo-400'
            }`}
          >
            👑
          </div>
          <div>
            <h3 className={`text-sm sm:text-base font-extrabold ${isLight ? 'text-indigo-950' : 'text-white'}`}>
              Chế Độ Quản Trị Cấp Cao: Toàn Bộ Công Việc Doanh Nghiệp
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-indigo-800' : 'text-indigo-300'}`}>
              Bạn có toàn quyền giao việc, duyệt nghiệm thu, phân công lại hoặc xóa bất kỳ hạng mục công việc nào.
            </p>
          </div>
        </div>
      </div>

      <TasksPage />
    </div>
  );
};
