import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { copyTextToClipboard } from '../utils/clipboard';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckSquare,
  Calendar,
  Layers,
  Eye,
  EyeOff,
  Bot,
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Member Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

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

  // Test Telegram Bot
  const [testTelegramMsg, setTestTelegramMsg] = useState('Hệ thống MadBros kiểm tra kết nối Bot Telegram!');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testTelegramResult, setTestTelegramResult] = useState<{ text: string; success: boolean } | null>(null);

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

  const handleCopyCode = async () => {
    if (workspace?.code) {
      const ok = await copyTextToClipboard(workspace.code);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
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

  const handleSendTestTelegram = async () => {
    try {
      setTestingTelegram(true);
      setTestTelegramResult(null);
      const res = await api.post('/workspaces/telegram/test', {
        customMessage: testTelegramMsg,
      });
      setTestTelegramResult({ text: res.data.message, success: true });
    } catch (error: any) {
      setTestTelegramResult({
        text: error.response?.data?.message || 'Gửi tin nhắn Telegram thất bại. Hãy kiểm tra cấu hình trong .env!',
        success: false,
      });
    } finally {
      setTestingTelegram(false);
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

  // Filter members
  const allUsers: any[] = workspace?.users || [];
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const totalMembers = filteredUsers.length;
  const totalMemberPages = Math.max(1, Math.ceil(totalMembers / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalMembers);
  const paginatedMembers = filteredUsers.slice(startIdx, endIdx);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Cài Đặt Workspace & Phân Quyền
          </h2>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}
          >
            {isAdmin ? 'Quản Trị Viên' : 'Thành Viên'}
          </span>
        </div>
        <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Quản lý mã mời thành viên, phân quyền Quản Trị Viên (ADMIN) / Thành Viên (MEMBER) và cấu hình Email SMTP
        </p>
      </div>

      {/* Workspace Top Banner & Invite Code Box */}
      <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{workspace?.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                  isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {workspace?.users?.length || 0} Thành viên
                </span>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Ngày thành lập: {new Date(workspace?.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          {/* Invite Code Box (Only visible for Admin, masked by default) */}
          {isAdmin && (
            <div className={`flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start gap-2 sm:gap-3 p-3 rounded-2xl border shadow-md ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-700/80'
            }`}>
              <div className="px-2 sm:px-3">
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Mã Mời Nhân Viên (Bảo Mật)</p>
                <p className="font-mono text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 tracking-widest">
                  {showCode ? workspace?.code : '••••••••'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                  title={showCode ? 'Ẩn mã mời' : 'Hiện mã mời'}
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition hover:scale-105 cursor-pointer"
                  title="Sao chép mã mời"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </button>
                <button
                  onClick={handleRegenerateCode}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Tạo mã mời mới ngẫu nhiên"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 12-Column Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Member List & Permissions (7 Cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className={`p-6 sm:p-7 rounded-3xl border space-y-5 shadow-xl ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Thành Viên Workspace ({workspace?.users?.length || 0})
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Danh sách nhân sự & quyền hạn trong hệ thống</p>
                </div>
              </div>

              {/* Search member */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm thành viên..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            <div className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {paginatedMembers.map((m: any) => {
                const isSelf = m.id === user?.id;

                return (
                  <div key={m.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner border ${
                        isLight
                          ? 'bg-blue-100 border-blue-200 text-blue-700'
                          : 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600/80 text-blue-400'
                      }`}>
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{m.name}</p>
                          {isSelf && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                              Bạn
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Role selection dropdown (for Admin) */}
                      {isAdmin ? (
                        <select
                          value={m.role}
                          disabled={isSelf}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none transition shadow-sm ${
                            m.role === 'ADMIN'
                              ? isLight ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                              : isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          <option value="ADMIN">🛡️ ADMIN (Quản Trị)</option>
                          <option value="MEMBER">👤 MEMBER (Thành Viên)</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                            m.role === 'ADMIN'
                              ? isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {m.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'THÀNH VIÊN'}
                        </span>
                      )}

                      {/* Remove member button */}
                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.name)}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${
                            isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                          }`}
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

            {/* Pagination for Members */}
            {totalMembers > pageSize && (
              <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
              }`}>
                <span>
                  Hiển thị {startIdx + 1} - {endIdx} / {totalMembers} thành viên
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-1 rounded-lg border disabled:opacity-40 cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className={`px-2 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {currentPage} / {totalMemberPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalMemberPages, p + 1))}
                    disabled={currentPage === totalMemberPages}
                    className={`p-1 rounded-lg border disabled:opacity-40 cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SMTP Configuration (if Admin) or Member Role Guide (if Member) */}
        <div className="xl:col-span-5 space-y-6">
          {isAdmin ? (
            <>
            {/* Card Cấu Hình & Test Bot Telegram */}
            <div className={`p-6 sm:p-7 rounded-3xl border space-y-6 shadow-xl ${
              isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-sky-500/15 text-sky-400 border-sky-500/20'
                  }`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Thông Báo Telegram Bot 2 Chiều
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-600 border border-sky-500/20">
                        ⚡ Real-Time Auto
                      </span>
                    </h3>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Tự động bắn tin nhắn lên Nhóm / Kênh Telegram công ty khi có hoạt động
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                isLight ? 'bg-sky-50/60 border-sky-200 text-slate-700' : 'bg-sky-950/20 border-sky-500/30 text-sky-200'
              }`}>
                <p className="font-bold flex items-center gap-1.5 text-sky-600">
                  <Sparkles className="w-3.5 h-3.5" /> 8 Sự Kiện Tự Động Bắn Tin Lên Telegram:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1 opacity-90">
                  <div>👑 Sếp giao việc mới (Task)</div>
                  <div>⚡ Nhân viên bấm Tiếp nhận việc</div>
                  <div>📝 Nhân viên nộp báo cáo nghiệm thu</div>
                  <div>🏆 Sếp duyệt hoàn thành 100%</div>
                  <div>⚠️ Sếp yêu cầu chỉnh sửa/làm lại</div>
                  <div>📅 Sếp lên lịch họp công ty mới</div>
                  <div>🗳️ Thành viên xác nhận tham gia họp</div>
                  <div>🎉 Chào mừng nhân sự mới được duyệt</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Cách Cấu Hình Trong File <code>server/.env</code>:
                </label>
                <div className={`p-3 rounded-xl font-mono text-[11px] border overflow-x-auto ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-sky-300'
                }`}>
                  <code>TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI... (Lấy từ @BotFather)</code><br/>
                  <code>TELEGRAM_CHAT_ID=-1001234567890 (Lấy từ @RawDataBot trong nhóm)</code><br/>
                  <code>TELEGRAM_ENABLED=true</code>
                </div>
              </div>

              {/* Test Telegram Box */}
              <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Kiểm Tra Kết Nối Bot (Test Telegram Message)
                </h4>
                {testTelegramResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testTelegramResult.success
                        ? isLight ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                        : isLight ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {testTelegramResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    {testTelegramResult.text}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nhập nội dung test thử..."
                    value={testTelegramMsg}
                    onChange={(e) => setTestTelegramMsg(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-sky-500 border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
                    }`}
                  />
                  <button
                    onClick={handleSendTestTelegram}
                    disabled={testingTelegram}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-sky-500/20 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> {testingTelegram ? 'Đang gửi...' : 'Gửi Test Telegram'}
                  </button>
                </div>
              </div>
            </div>
          </>
          ) : (
            <div className={`p-6 sm:p-7 rounded-3xl border space-y-4 shadow-xl ${
              isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Quyền Hạn Của Bạn</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tài khoản Thành Viên (MEMBER)</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <CheckSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Tiếp nhận & Thực hiện Công việc</p>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Nhận task được giao, tích checklist việc con, nộp báo cáo kết quả nghiệm thu.</p>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <Calendar className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Lên Lịch & Tham Gia Cuộc Họp</p>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Đặt lịch họp mới, xác nhận tham gia (RSVP) và vào phòng Google Meet / Zoom.</p>
                  </div>
                </div>

                <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <Users className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Mời Đồng Nghiệp Vào Nhóm</p>
                    <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Liên hệ Quản trị viên để được cấp mã mời tham gia phòng làm việc.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
