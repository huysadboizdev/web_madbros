import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  CheckSquare,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Plus,
  Video,
  Users,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ListTodo,
  FileCheck,
  FileSignature,
} from 'lucide-react';
import { AnnouncementsFeed } from '../components/AnnouncementsFeed';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stats/overview');
      setData(res.data);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu overview', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccept = async (taskId: string) => {
    try {
      setAcceptingId(taskId);
      await api.post(`/tasks/${taskId}/accept`);
      await fetchOverview();
    } catch (error) {
      console.error('Lỗi tiếp nhận task', error);
    } finally {
      setAcceptingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const currentDateFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Đang tải bảng điều khiển...
          </p>
        </div>
      </div>
    );
  }

  const isMember = user?.role === 'MEMBER';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const tasks = data?.tasks || {};
  const meetings = data?.meetings || {};
  const finance = data?.finance || {};

  const pendingAcceptTasks = (tasks.recent || []).filter((t: any) =>
    t.assignees?.some((a: any) => a.id === user?.id && a.acceptanceStatus === 'PENDING')
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome & Quick Actions */}
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border shadow-xl backdrop-blur-xl transition-all duration-300 ${
          isLight
            ? 'bg-gradient-to-r from-blue-100/70 via-indigo-50 to-white border-blue-200/90 shadow-blue-500/5'
            : 'bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border-white/[0.08] shadow-2xl'
        }`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span
                className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${
                  isLight ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                }`}
              >
                {currentDateFormatted}
              </span>
              <span
                className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 border ${
                  isLight ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {user?.role === 'ADMIN' ? 'Quản Trị Viên' : user?.role === 'MANAGER' ? 'Trưởng Phòng' : 'Nhân Viên'}
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight break-words leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {getGreeting()},{' '}
              <span className={isLight ? 'text-blue-600 font-extrabold' : 'gradient-text'}>
                {user?.name || 'Bạn'}
              </span>
              !
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed break-words ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              {isMember ? (
                <>
                  Hôm nay bạn có <strong className="text-blue-600 dark:text-blue-400">{tasks.inProgress || 0}</strong> công việc cần xử lý và <strong className="text-purple-600 dark:text-purple-400">{meetings.todayCount || 0}</strong> cuộc họp tại <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{user?.workspaceName}</span>.
                </>
              ) : (
                <>
                  Hệ thống ghi nhận <strong className="text-blue-600 dark:text-blue-400">{tasks.inProgress || 0}</strong> công việc đang chạy và <strong className="text-purple-600 dark:text-purple-400">{meetings.todayCount || 0}</strong> cuộc họp hôm nay tại <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{user?.workspaceName}</span>.
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            {user?.role === 'SECRETARY' && (
              <button
                onClick={() => setActiveTab('secretary')}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <FileSignature className="w-4 h-4" /> Điều Phối Thư Ký
              </button>
            )}
            <button
              onClick={() => setActiveTab('tasks')}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" /> {isMember ? 'Xem Việc Của Tôi' : user?.role === 'SECRETARY' ? 'Theo Dõi Công Việc' : 'Giao Việc Mới'}
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> {isMember ? 'Lịch Họp Của Tôi' : user?.role === 'SECRETARY' ? 'Lịch Họp BGD' : 'Đặt Lịch Họp'}
            </button>
          </div>
        </div>

        {/* Ambient background blur inside banner */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Member Alert: Task Pending Acceptance */}
      {pendingAcceptTasks.length > 0 && (
        <div
          className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-in slide-in-from-top-2 ${
            isLight
              ? 'bg-purple-50 border-purple-200 text-purple-950'
              : 'bg-purple-950/40 border-purple-500/40 text-white shadow-xl'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border ${
                isLight ? 'bg-purple-200 border-purple-300 text-purple-800' : 'bg-purple-600/30 border-purple-500/40 text-purple-400'
              }`}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h4 className={`text-xs sm:text-sm font-bold truncate ${isLight ? 'text-purple-950' : 'text-white'}`}>
                Bạn có {pendingAcceptTasks.length} công việc mới chờ tiếp nhận!
              </h4>
              <p className={`text-[11px] sm:text-xs ${isLight ? 'text-purple-800' : 'text-purple-300'} line-clamp-1`}>
                Hãy bấm "Nhận ngay" để bắt đầu thực hiện các việc con và báo cáo tiến độ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {pendingAcceptTasks.map((t: any) => (
              <button
                key={t.id}
                onClick={() => handleQuickAccept(t.id)}
                disabled={acceptingId === t.id}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                {acceptingId === t.id ? 'Đang nhận...' : '⚡ Tiếp nhận ngay'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards Grid (Adaptive Theme) */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
        <StatCard
          title={isMember ? 'Công Việc Của Tôi' : 'Tổng Công Việc'}
          value={tasks.total || 0}
          subtitle={`${tasks.done || 0} việc đã hoàn thành 100%`}
          icon={<CheckSquare className="w-6 h-6" />}
          trend={`${tasks.inProgress || 0} việc đang làm`}
          trendPositive={true}
          color="blue"
        />

        <StatCard
          title="Lịch Họp Hôm Nay"
          value={meetings.todayCount || 0}
          subtitle={`${meetings.upcomingCount || 0} cuộc họp sắp diễn ra`}
          icon={<Calendar className="w-6 h-6" />}
          trend={meetings.todayCount > 0 ? 'Có lịch họp' : 'Lịch trống'}
          trendPositive={meetings.todayCount > 0}
          color="purple"
        />

        {isMember ? (
          <>
            <StatCard
              title="Chờ Tiếp Nhận"
              value={pendingAcceptTasks.length}
              subtitle="Công việc mới được giao"
              icon={<ListTodo className="w-6 h-6" />}
              trend={pendingAcceptTasks.length > 0 ? 'Cần tiếp nhận' : 'Đã nhận hết'}
              trendPositive={pendingAcceptTasks.length === 0}
              color="amber"
            />

            <StatCard
              title="Tỷ Lệ Hoàn Thành"
              value={`${tasks.total > 0 ? Math.round(((tasks.done || 0) / tasks.total) * 100) : 100}%`}
              subtitle="Hiệu suất xử lý công việc"
              icon={<FileCheck className="w-6 h-6" />}
              trendPositive={true}
              trend="Năng suất tốt"
              color="emerald"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Chờ Duyệt Nghiệm Thu"
              value={tasks.review || 0}
              subtitle="Nhân viên đã nộp báo cáo"
              icon={<ListTodo className="w-6 h-6" />}
              trend={tasks.review > 0 ? 'Cần duyệt nghiệm thu' : 'Đã duyệt hết'}
              trendPositive={tasks.review === 0}
              color="amber"
            />

            <StatCard
              title="Tỷ Lệ Hoàn Thành"
              value={`${tasks.total > 0 ? Math.round(((tasks.done || 0) / tasks.total) * 100) : 100}%`}
              subtitle="Năng suất toàn đội ngũ"
              icon={<TrendingUp className="w-6 h-6" />}
              trendPositive={true}
              trend="Hiệu quả cao"
              color="emerald"
            />
          </>
        )}
      </div>

      {/* Main Grid: 12-Column Responsive Widescreen Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Tasks + Progress */}
        <div className="xl:col-span-7 space-y-6 sm:space-y-8 min-w-0">
          {/* Recent Tasks Card */}
          <div className="glass-panel p-3.5 min-[360px]:p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xl">
            <div className={`flex items-center justify-between pb-3 border-b gap-2 min-w-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`p-2 sm:p-2.5 rounded-xl border shrink-0 ${
                    isLight ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-sm sm:text-base lg:text-lg font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {isMember ? 'Công Việc Của Bạn' : 'Tiến Độ Gần Đây'}
                  </h3>
                  <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} line-clamp-1`}>
                    {isMember ? 'Tích hoàn thành việc con và nộp báo cáo kết quả' : 'Các hạng mục đang triển khai trong Workspace'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`text-xs font-bold flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border ${
                  isLight
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                }`}
              >
                <span className="hidden min-[360px]:inline">Xem</span> chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {tasks.recent?.length === 0 ? (
                <div
                  className={`text-center py-10 sm:py-12 space-y-3 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <CheckSquare className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Chưa có công việc nào trong danh sách
                  </p>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    + Xem trang quản lý công việc
                  </button>
                </div>
              ) : (
                tasks.recent?.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab('tasks')}
                    className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer space-y-2.5 sm:space-y-3 shadow-sm hover:shadow-md group border ${
                      isLight
                        ? 'bg-slate-50/80 hover:bg-blue-50/60 border-slate-200 hover:border-blue-300'
                        : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-blue-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <span
                          className={`font-bold text-xs sm:text-sm transition line-clamp-2 break-words ${
                            isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'
                          }`}
                        >
                          {t.title}
                        </span>
                        {t.description && (
                          <p className={`text-[11px] sm:text-xs line-clamp-1 break-words ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.description}</p>
                        )}
                      </div>
                      <span
                        className={`text-[9px] min-[360px]:text-[10px] font-extrabold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap shrink-0 border ${
                          t.status === 'DONE'
                            ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : t.status === 'IN_PROGRESS'
                            ? isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : t.status === 'REVIEW'
                            ? isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : isLight ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {t.status === 'DONE' ? 'Hoàn thành' : t.status === 'IN_PROGRESS' ? 'Đang làm' : t.status === 'REVIEW' ? 'Chờ duyệt' : 'Chờ nhận'}
                      </span>
                    </div>

                    {/* Progress Bar with glowing indicator */}
                    <div className="space-y-1">
                      <div className={`flex justify-between text-[10px] min-[360px]:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span className="font-medium">Tiến độ ({t.completedSubtasks || 0}/{t.totalSubtasks || 0})</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">{t.progress}%</span>
                      </div>
                      <div className={`w-full h-1.5 sm:h-2 rounded-full overflow-hidden p-0.5 border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700/50'}`}>
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Meetings + Fast Links */}
        <div className="xl:col-span-5 space-y-6 sm:space-y-8 min-w-0">
          {/* Today Meetings Card */}
          <div className="glass-panel p-3.5 min-[360px]:p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xl">
            <div className={`flex items-center justify-between pb-3 border-b gap-2 min-w-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`p-2 sm:p-2.5 rounded-xl border shrink-0 ${
                    isLight ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-500/15 text-purple-400 border-purple-500/20'
                  }`}
                >
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-sm sm:text-base lg:text-lg font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Lịch Họp Hôm Nay
                  </h3>
                  <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} line-clamp-1`}>
                    Các cuộc họp trực tuyến & nội bộ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`text-xs font-bold flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 border ${
                  isLight
                    ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20'
                }`}
              >
                <span className="hidden min-[360px]:inline">Xem</span> lịch <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {meetings.today?.length === 0 ? (
                <div
                  className={`text-center py-10 sm:py-12 space-y-3 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <Calendar className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Hôm nay không có cuộc họp nào.</p>
                  <button
                    onClick={() => setActiveTab('meetings')}
                    className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                  >
                    + Đặt lịch họp mới ngay
                  </button>
                </div>
              ) : (
                meetings.today?.map((m: any) => (
                  <div
                    key={m.id}
                    className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition space-y-2 border ${
                      isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                      <p className={`font-bold text-xs sm:text-sm line-clamp-2 break-words flex-1 min-w-0 ${isLight ? 'text-slate-900' : 'text-white'}`}>{m.title}</p>
                      <span
                        className={`text-[9px] min-[360px]:text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 border ${
                          m.isOnline
                            ? isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {m.isOnline ? 'Online' : 'Trực tiếp'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-4 text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        {new Date(m.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(m.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
