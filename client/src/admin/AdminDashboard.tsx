import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import {
  Users,
  CheckSquare,
  Calendar,
  DollarSign,
  ShieldCheck,
  Package,
  UserPlus,
  CheckCircle2,
  Clock,
  Laptop,
  KeyRound,
  Copy,
  Check,
  ArrowUpRight,
  Eye,
  EyeOff,
  FileSignature,
} from 'lucide-react';

interface AdminDashboardProps {
  setActiveAdminTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setActiveAdminTab }) => {
  const { theme } = useTheme();
  const { subscribe } = useSocket();
  const isLight = theme === 'light';

  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [customRoomCode, setCustomRoomCode] = useState('');
  const [updatingCode, setUpdatingCode] = useState(false);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminOverview();

    // ⚡ Real-Time WebSocket: Cập nhật các chỉ số tổng quan ngay lập tức
    const unsubTask = subscribe('task:created', () => fetchAdminOverview());
    const unsubTaskUp = subscribe('task:updated', () => fetchAdminOverview());
    const unsubMeeting = subscribe('meeting:created', () => fetchAdminOverview());
    const unsubPending = subscribe('user:pending_new', () => fetchAdminOverview());
    const unsubApproved = subscribe('workspace:member_approved', () => fetchAdminOverview());

    return () => {
      unsubTask();
      unsubTaskUp();
      unsubMeeting();
      unsubPending();
      unsubApproved();
    };
  }, [subscribe]);

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/overview');
      setOverview(res.data);
      setCustomRoomCode(res.data.workspaceCode || '');
    } catch (error) {
      console.error('Lỗi tải overview admin', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (overview?.workspaceCode) {
      navigator.clipboard.writeText(overview.workspaceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleUpdateRoomCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomCode.trim()) return;

    try {
      setUpdatingCode(true);
      const res = await api.put('/admin/workspace-code', { code: customRoomCode.trim() });
      setCodeSuccessMsg(res.data.message);
      setOverview((prev: any) => ({ ...prev, workspaceCode: res.data.code }));
      setTimeout(() => setCodeSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi đổi mã phòng');
    } finally {
      setUpdatingCode(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Đang tải dữ liệu Trung Tâm Điều Hành...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Top Executive Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border backdrop-blur-2xl transition-all duration-300 ${
          isLight
            ? 'bg-gradient-to-r from-amber-100/70 via-orange-50 to-white border-amber-200/90 shadow-xl shadow-amber-500/5'
            : 'bg-gradient-to-r from-amber-950/40 via-purple-950/25 to-slate-900 border-amber-500/30 shadow-xl'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-2.5 shadow-lg flex items-center justify-center shrink-0 border transition-all ${
                isLight
                  ? 'bg-white border-amber-200 shadow-amber-500/10'
                  : 'bg-slate-900 border-amber-500/40 shadow-amber-500/20'
              }`}
            >
              <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm border ${
                    isLight
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-800'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> TRUNG TÂM ĐIỀU HÀNH DOANH NGHIỆP
                </span>
                <span
                  className={`text-[11px] font-bold flex items-center gap-1 ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Quyền Boss Tối Cao
                </span>
              </div>
              <h1
                className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Bảng Tổng Quan Quản Trị Cấp Cao
              </h1>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Giám sát {overview?.totalUsers || 0} nhân sự, tài sản ({formatCurrency(overview?.totalAssetsValue)}), công việc và lịch họp theo thời gian thực.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            <button
              onClick={() => setActiveAdminTab('secretary')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/25 transition hover:scale-105 cursor-pointer"
            >
              <FileSignature className="w-4 h-4" /> Ban Thư Ký
            </button>
            <button
              onClick={() => setActiveAdminTab('users')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-600/25 transition hover:scale-105 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Thêm Nhân Viên
            </button>
            <button
              onClick={() => setActiveAdminTab('assets')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-amber-600/25 transition hover:scale-105 cursor-pointer"
            >
              <Package className="w-4 h-4" /> Nhập Tài Sản
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Pending Approval Alert Banner (High visibility) */}
      {overview?.pendingApprovalsCount > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in transition-all ${
            isLight
              ? 'bg-gradient-to-r from-amber-100 via-orange-50 to-amber-50 border-amber-300 text-amber-950'
              : 'bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 border-amber-500/50 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
                isLight
                  ? 'bg-amber-200 border-amber-300 text-amber-800'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className={`font-extrabold text-sm ${isLight ? 'text-amber-950' : 'text-white'}`}>
                Có <span className="text-amber-600 dark:text-amber-400 font-extrabold">{overview.pendingApprovalsCount} nhân viên mới</span> vừa nhập mã phòng và đang chờ bạn phê duyệt!
              </h4>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-amber-800' : 'text-slate-300'}`}>
                Nhân viên bị cách ly bảo mật và chỉ được vào phòng làm việc sau khi bạn duyệt tay.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveAdminTab('users')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs shadow-lg shadow-amber-500/30 transition hover:scale-105 shrink-0"
          >
            Mở Danh Sách Duyệt Ngay ➔
          </button>
        </div>
      )}

      {/* 3. 4 Core Stat Cards (Adaptive Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Nhân Sự Chính Thức"
          value={overview?.totalUsers || 0}
          subtitle={`${overview?.pendingApprovalsCount || 0} yêu cầu chờ duyệt`}
          icon={<Users className="w-5 h-5" />}
          trend="Đã xác thực"
          trendPositive={true}
          color="blue"
        />

        <StatCard
          title="Tổng Tài Sản Doanh Nghiệp"
          value={formatCurrency(overview?.totalAssetsValue)}
          subtitle={`${overview?.totalAssets || 0} thiết bị & tài sản`}
          icon={<Laptop className="w-5 h-5" />}
          trend="Được kiểm kê"
          trendPositive={true}
          color="amber"
        />

        <StatCard
          title="Công Việc Toàn Công Ty"
          value={overview?.totalTasks || 0}
          subtitle={`${overview?.pendingReviewTasks || 0} việc đang chờ duyệt`}
          icon={<CheckSquare className="w-5 h-5" />}
          trend={overview?.pendingReviewTasks > 0 ? 'Cần duyệt' : 'Đã duyệt hết'}
          trendPositive={overview?.pendingReviewTasks === 0}
          color={overview?.pendingReviewTasks > 0 ? 'rose' : 'emerald'}
        />

        <StatCard
          title="Số Dư Dòng Tiền"
          value={formatCurrency(overview?.balance)}
          subtitle={`Thu: ${formatCurrency(overview?.income)}`}
          icon={<DollarSign className="w-5 h-5" />}
          trendPositive={overview?.balance >= 0}
          trend={overview?.balance >= 0 ? '+ Dương quỹ' : '- Thâm hụt'}
          color={overview?.balance >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* 4. Responsive Split: Room Code + Modules (7 cols) & Recent Staff (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Room Code Manager + Modules (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Room Code Card */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4">
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    isLight
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Mã Phòng Công Ty (Room Code)
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Admin có thể tự đặt hoặc sửa mã phòng để gửi cho nhân viên
                  </p>
                </div>
              </div>
            </div>

            {codeSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {codeSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUpdateRoomCode} className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full flex-1">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showRoomCode ? 'text' : 'password'}
                  required
                  placeholder="VD: MADBROS2026"
                  value={customRoomCode}
                  onChange={(e) => setCustomRoomCode(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 rounded-xl text-xs sm:text-sm font-mono font-extrabold uppercase tracking-widest focus:outline-none transition border ${
                    isLight
                      ? 'bg-white border-slate-300 text-amber-700 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-700 text-amber-400 focus:border-amber-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRoomCode(!showRoomCode)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                  title={showRoomCode ? 'Ẩn mã phòng' : 'Hiện mã phòng'}
                >
                  {showRoomCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={updatingCode}
                  className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-amber-500/20 transition whitespace-nowrap cursor-pointer"
                >
                  {updatingCode ? 'Đang lưu...' : 'Lưu Mã Phòng'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Admin Modules */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4">
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    isLight
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Phân Hệ Quản Trị Cốt Lõi
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Các công cụ kiểm soát và điều hành dành cho Boss
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div
                onClick={() => setActiveAdminTab('users')}
                className={`p-4 rounded-2xl border transition cursor-pointer space-y-1.5 group shadow-sm ${
                  isLight
                    ? 'bg-slate-50 hover:bg-blue-50/70 border-slate-200 hover:border-blue-300'
                    : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-blue-500/40'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className={`font-bold text-xs sm:text-sm transition ${isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-white group-hover:text-blue-400'}`}>
                  Quản Lý & Duyệt Nhân Sự
                </h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Duyệt tay người mới, đổi quyền Admin/Member, đặt lại mật khẩu.
                </p>
              </div>

              <div
                onClick={() => setActiveAdminTab('assets')}
                className={`p-4 rounded-2xl border transition cursor-pointer space-y-1.5 group shadow-sm ${
                  isLight
                    ? 'bg-slate-50 hover:bg-amber-50/70 border-slate-200 hover:border-amber-300'
                    : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h4 className={`font-bold text-xs sm:text-sm transition ${isLight ? 'text-slate-900 group-hover:text-amber-600' : 'text-white group-hover:text-amber-400'}`}>
                  Quản Lý Tài Sản (Assets)
                </h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Khai báo thiết bị máy móc, bàn giao cấp phát cho nhân viên.
                </p>
              </div>

              <div
                onClick={() => setActiveAdminTab('tasks')}
                className={`p-4 rounded-2xl border transition cursor-pointer space-y-1.5 group shadow-sm ${
                  isLight
                    ? 'bg-slate-50 hover:bg-indigo-50/70 border-slate-200 hover:border-indigo-300'
                    : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-indigo-500/40'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h4 className={`font-bold text-xs sm:text-sm transition ${isLight ? 'text-slate-900 group-hover:text-indigo-600' : 'text-white group-hover:text-indigo-400'}`}>
                  Quản Lý Toàn Bộ Task
                </h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Giám sát tiến độ toàn công ty, phê duyệt nghiệm thu nhanh.
                </p>
              </div>

              <div
                onClick={() => setActiveAdminTab('meetings')}
                className={`p-4 rounded-2xl border transition cursor-pointer space-y-1.5 group shadow-sm ${
                  isLight
                    ? 'bg-slate-50 hover:bg-purple-50/70 border-slate-200 hover:border-purple-300'
                    : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className={`font-bold text-xs sm:text-sm transition ${isLight ? 'text-slate-900 group-hover:text-purple-600' : 'text-white group-hover:text-purple-400'}`}>
                  Quản Lý Lịch Họp Doanh Nghiệp
                </h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Lên lịch họp khẩn, dời giờ, giám sát điểm danh tham gia.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Staff List (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4">
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    isLight
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Nhân Sự Mới Tham Gia
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Thành viên vừa gia nhập Workspace
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAdminTab('users')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Tất cả <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {overview?.recentUsers?.map((u: any) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                        isLight
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-slate-800 border-slate-700 text-blue-400'
                      }`}
                    >
                      {u.name?.slice(0, 1)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {u.name}
                      </p>
                      <p className={`text-[10px] truncate max-w-[160px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                      u.role === 'ADMIN'
                        ? isLight
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              ))}

              {(!overview?.recentUsers || overview?.recentUsers.length === 0) && (
                <p className={`text-xs text-center py-6 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Chưa có thành viên nào khác
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
