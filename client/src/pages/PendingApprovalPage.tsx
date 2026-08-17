import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  ShieldCheck,
  KeyRound,
  RefreshCw,
  LogOut,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';

export const PendingApprovalPage: React.FC = () => {
  const { user, requestJoinWorkspace, refreshUser, logout } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await requestJoinWorkspace(code.trim());
      setSuccess('Đã gửi yêu cầu thành công! Vui lòng chờ Admin duyệt.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã phòng không chính xác hoặc không tồn tại');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      await refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const hasSubmittedCode = Boolean(user?.joinCodeUsed && user.joinCodeUsed.trim().length > 0);

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
        isLight ? 'bg-[#f4f7fb] text-slate-900' : 'bg-[#060913] text-slate-100'
      }`}
    >
      {/* Top Right Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Ambient background glows */}
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-purple" />
      <div className="ambient-glow-emerald" />

      {/* Main Glass Modal Card */}
      <div className="w-full max-w-[500px] z-10 animate-in fade-in zoom-in-95 duration-300">
        <div
          className={`p-7 sm:p-9 rounded-3xl border shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-2xl transition-all ${
            isLight
              ? 'bg-white/95 border-slate-200 shadow-slate-200/80 text-slate-900'
              : 'bg-slate-900/90 border-slate-700/80 shadow-black/60 text-slate-100'
          }`}
        >
          {/* Top Logo & Header */}
          <div className="text-center space-y-3">
            <div
              className={`mx-auto w-16 h-16 rounded-3xl p-3 shadow-xl flex items-center justify-center border transition-all ${
                isLight
                  ? 'bg-blue-50 border-blue-200 shadow-blue-500/10'
                  : 'bg-slate-800 border-slate-700 shadow-blue-500/20'
              }`}
            >
              <img src="/logo.png" alt="MadBros Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>

            <div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border mb-1.5 ${
                  isLight
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" /> GIA NHẬP PHÒNG LÀM VIỆC
              </span>
              <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {hasSubmittedCode ? 'Đang Chờ Admin Phê Duyệt' : 'Nhập Mã Phòng Công Ty'}
              </h2>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Chào mừng <strong className={isLight ? 'text-slate-900' : 'text-white'}>{user?.name}</strong>! Vui lòng nhập mã phòng làm việc do Quản trị viên cung cấp để gửi yêu cầu tham gia.
              </p>
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!hasSubmittedCode ? (
            /* State 1: Input Code Form */
            <form onSubmit={handleJoinSubmit} className="space-y-4 pt-1">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Mã Phòng Công Ty (Workspace Code)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="VD: MadBros2026, devteam..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm font-mono font-extrabold tracking-widest focus:outline-none transition shadow-inner border ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-slate-950/80 border-slate-700 text-amber-400 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-xl shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Gửi Yêu Cầu Gia Nhập</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* State 2: Waiting Approval Locked State */
            <div className="space-y-4 text-center pt-2">
              <div
                className={`p-4 rounded-2xl border space-y-2 text-left ${
                  isLight
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Yêu Cầu Đang Chờ Duyệt Tay</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  Tài khoản của bạn đã gửi yêu cầu gia nhập vào phòng mã{' '}
                  <span className="font-mono font-extrabold bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
                    {user?.joinCodeUsed}
                  </span>
                  . Admin công ty sẽ duyệt yêu cầu này để bạn có thể vào làm việc.
                </p>
              </div>

              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Đang kiểm tra...' : 'Kiểm Tra Trạng Thái Duyệt'}</span>
              </button>
            </div>
          )}

          {/* Action Footer: Logout button */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bảo mật Zero-Trust</span>
            </div>

            <button
              onClick={logout}
              className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
