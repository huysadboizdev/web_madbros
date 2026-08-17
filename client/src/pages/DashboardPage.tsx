import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
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
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onOpenCreateTask?: () => void;
  onOpenCreateMeeting?: () => void;
  onOpenCreateTransaction?: () => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({
  setActiveTab,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tasks = data?.tasks || {};
  const meetings = data?.meetings || {};
  const finance = data?.finance || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bảng Điều Khiển Tổng Quan
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Tổng hợp tiến độ công việc, lịch họp và tình hình tài chính doanh nghiệp
          </p>
        </div>

        {/* Quick actions buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab('tasks')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" /> Việc Mới
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition"
          >
            <Calendar className="w-4 h-4" /> Đặt Lịch Họp
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
          >
            <DollarSign className="w-4 h-4" /> Thu / Chi
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Tổng Công Việc"
          value={tasks.total || 0}
          subtitle={`${tasks.done || 0} việc đã hoàn thành`}
          icon={<CheckSquare className="w-6 h-6" />}
          trend={`${tasks.inProgress || 0} đang làm`}
          trendPositive={true}
          color="blue"
        />

        <StatCard
          title="Lịch Họp Hôm Nay"
          value={meetings.todayCount || 0}
          subtitle={`${meetings.upcomingCount || 0} cuộc họp sắp tới`}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
        />

        <StatCard
          title="Tổng Thu Nhập"
          value={formatCurrency(finance.totalIncome)}
          subtitle="Doanh thu & hợp đồng"
          icon={<TrendingUp className="w-6 h-6" />}
          color="emerald"
        />

        <StatCard
          title="Số Dư Dòng Tiền"
          value={formatCurrency(finance.balance)}
          subtitle={`Tổng chi: ${formatCurrency(finance.totalExpense)}`}
          icon={<DollarSign className="w-6 h-6" />}
          trendPositive={finance.balance >= 0}
          trend={finance.balance >= 0 ? 'Dương tiền' : 'Âm tiền'}
          color={finance.balance >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Recent Tasks with Progress */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Tiến Độ Công Việc Gần Đây</h3>
            </div>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tasks.recent?.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">Chưa có công việc nào</p>
            ) : (
              tasks.recent?.map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-sm text-slate-100">{t.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        t.status === 'DONE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {t.status === 'DONE' ? 'Hoàn thành' : t.status === 'IN_PROGRESS' ? 'Đang làm' : 'Cần làm'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Tiến độ việc con</span>
                      <span className="font-bold text-blue-400">{t.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Today & Upcoming Meetings */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Lịch Họp Hôm Nay</h3>
            </div>
            <button
              onClick={() => setActiveTab('meetings')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Xem lịch họp <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {meetings.today?.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-xs text-slate-500">Hôm nay không có cuộc họp nào.</p>
                <button
                  onClick={() => setActiveTab('meetings')}
                  className="text-xs text-indigo-400 hover:underline font-medium"
                >
                  + Đặt lịch họp mới ngay
                </button>
              </div>
            ) : (
              meetings.today?.map((m: any) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{m.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {new Date(m.startTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(m.endTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {m.meetingLink && (
                      <a
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
                      >
                        <Video className="w-3.5 h-3.5" /> Tham gia
                      </a>
                    )}
                  </div>

                  {m.location && (
                    <p className="text-xs text-slate-400">
                      📍 <span className="font-medium text-slate-300">{m.location}</span>
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
                    <span>Tạo bởi: {m.createdBy?.name}</span>
                    <span>{m.participants?.length || 0} người tham gia</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
