import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  Mail,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserX,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // SMTP Settings form
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Test Email
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workspaces');
      setWorkspace(res.data);

      if (res.data.settings) {
        setSmtpHost(res.data.settings.smtpHost || 'smtp.gmail.com');
        setSmtpPort(String(res.data.settings.smtpPort || 587));
        setSmtpUser(res.data.settings.smtpUser || '');
        setSmtpPass(res.data.settings.smtpPass || '');
        setSmtpFrom(res.data.settings.smtpFrom || '');
      }
    } catch (error) {
      console.error('Lỗi tải workspace', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (workspace?.code) {
      navigator.clipboard.writeText(workspace.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Đổi mã mời mới sẽ làm mã mời cũ mất hiệu lực. Bạn có muốn tiếp tục?')) return;
    try {
      const res = await api.post('/workspaces/regenerate-code');
      setWorkspace({ ...workspace, code: res.data.code });
      refreshUser();
    } catch (error) {
      console.error('Lỗi đổi mã', error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/workspaces/members/${userId}/role`, { role: newRole });
      setWorkspace((prev: any) => ({
        ...prev,
        users: prev.users.map((u: any) => (u.id === userId ? { ...u, role: newRole } : u)),
      }));
      if (userId === user?.id) {
        refreshUser();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi thay đổi quyền hạn');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thành viên "${memberName}" khỏi Workspace?`)) return;
    try {
      await api.delete(`/workspaces/members/${userId}`);
      setWorkspace((prev: any) => ({
        ...prev,
        users: prev.users.filter((u: any) => u.id !== userId),
      }));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa thành viên');
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSmtp(true);
      setSmtpMessage(null);
      await api.put('/workspaces/settings/smtp', {
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpFrom,
      });
      setSmtpMessage({ text: 'Đã lưu cấu hình Email thành công!', success: true });
    } catch (error: any) {
      setSmtpMessage({
        text: error.response?.data?.message || 'Lỗi khi lưu cấu hình',
        success: false,
      });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    try {
      setTestingEmail(true);
      setTestEmailResult(null);
      const res = await api.post('/workspaces/settings/test-email', {
        testEmail: testEmailAddress,
      });
      setTestEmailResult({ text: res.data.message, success: true });
    } catch (error: any) {
      setTestEmailResult({
        text: error.response?.data?.message || 'Gửi thư thử nghiệm thất bại',
        success: false,
      });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Cài Đặt Workspace & Phân Quyền
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý mã mời thành viên, phân quyền Quản Trị Viên (ADMIN) / Thành Viên (USER) và cấu hình Email
        </p>
      </div>

      {/* Workspace Info & Invite Code */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{workspace?.name}</h3>
              <p className="text-xs text-slate-400">
                Tạo ngày {new Date(workspace?.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Invite Code Box */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
            <div className="px-3">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mã Mời Nhân Viên</p>
              <p className="font-mono text-base font-extrabold text-blue-400 tracking-widest">
                {workspace?.code}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
              title="Sao chép mã mời"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            </button>
            {isAdmin && (
              <button
                onClick={handleRegenerateCode}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition"
                title="Đổi mã mời mới"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Members & Phân Quyền */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              Danh Sách Thành Viên & Phân Quyền ({workspace?.users?.length || 0})
            </h3>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {workspace?.users?.map((m: any) => {
            const isSelf = m.id === user?.id;

            return (
              <div key={m.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-blue-400">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-100">{m.name}</p>
                      {isSelf && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.2 rounded-full font-semibold">
                          Bạn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Phân quyền Dropdown (Dành cho Admin) */}
                  {isAdmin ? (
                    <select
                      value={m.role}
                      disabled={isSelf}
                      onChange={(e) => handleChangeRole(m.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none transition ${
                        m.role === 'ADMIN'
                          ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      <option value="ADMIN">🛡️ ADMIN (Quản Trị)</option>
                      <option value="MEMBER">👤 USER (Thành Viên)</option>
                    </select>
                  ) : (
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                        m.role === 'ADMIN'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {m.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'THÀNH VIÊN'}
                    </span>
                  )}

                  {/* Kick member button (Chỉ Admin) */}
                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Xóa thành viên khỏi nhóm"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SMTP Email Configuration (Chỉ Admin mới thấy) */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cấu Hình Gửi Mail Tự Động (SMTP)</h3>
              <p className="text-xs text-slate-400">
                Dùng để tự động gửi thư mời họp & thông báo lịch đến tất cả nhân sự qua Gmail hoặc Mail server riêng
              </p>
            </div>
          </div>

          {smtpMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                smtpMessage.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {smtpMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {smtpMessage.text}
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Máy Chủ SMTP (SMTP Host)
                </label>
                <input
                  type="text"
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cổng SMTP (Port)
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tài Khoản Email (Gmail / Mail user)
                </label>
                <input
                  type="email"
                  placeholder="your-company@gmail.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mật Khẩu Ứng Dụng (App Password)
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên Người Gửi Hiển Thị Trong Thư
              </label>
              <input
                type="text"
                placeholder="Thông Báo Công Ty <no-reply@madbros.vn>"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingSmtp}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {savingSmtp ? 'Đang lưu...' : 'Lưu Cấu Hình SMTP'}
            </button>
          </form>

          {/* Test Email Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Gửi Thư Thử Nghiệm (Test Email)</h4>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Nhập email nhận thử nghiệm..."
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {testingEmail ? (
                  'Đang gửi...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Gửi Thử
                  </>
                )}
              </button>
            </div>

            {testEmailResult && (
              <p
                className={`text-xs font-medium ${
                  testEmailResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testEmailResult.text}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
