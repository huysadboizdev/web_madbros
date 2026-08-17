import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, LogIn, UserPlus, Users, KeyRound, Mail, User, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, registerAdmin, joinWorkspace } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'join'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await login({ email, password });
      } else if (tab === 'register') {
        await registerAdmin({ email, password, name, workspaceName });
      } else if (tab === 'join') {
        await joinWorkspace({ email, password, name, inviteCode });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/30 mb-3">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            MAD<span className="text-blue-500">BROS</span> ENTERPRISE
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Hệ thống Quản lý Công việc, Lịch họp & Dòng tiền
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-800">
          {/* Tabs switch */}
          <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                tab === 'login'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                tab === 'register'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tạo Mới Cty
            </button>
            <button
              type="button"
              onClick={() => { setTab('join'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                tab === 'join'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nhập Mã Join
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'join' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mã Mời Workspace (Invite Code)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="VD: MADBROS"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase font-mono font-bold tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập mã mời được quản trị viên công ty cung cấp để tham gia.
                </p>
              </div>
            )}

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên Công Ty / Doanh Nghiệp
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Công Ty Cổ Phần MadBros"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {(tab === 'register' || tab === 'join') && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Họ và Tên Của Bạn
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Địa Chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật Khẩu
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Đăng Nhập
                </>
              ) : tab === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" /> Tạo Doanh Nghiệp Mới
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" /> Gia Nhập Workspace
                </>
              )}
            </button>
          </form>

          {/* Seed demo credentials hint */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 font-medium">Tài khoản demo sẵn có:</p>
            <p className="text-[11px] text-blue-400 font-mono mt-0.5">
              admin@madbros.vn / 123456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
