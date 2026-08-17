import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { Modal } from '../components/Modal';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  Edit,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Mail,
  User as UserIcon,
  Laptop,
  CheckSquare,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');

  // Lists
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [approveRole, setApproveRole] = useState('MEMBER');

  // Form states
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('MEMBER');
  const [newPassword, setNewPassword] = useState('');
  const { subscribe } = useSocket();

  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchPendingUsers();

    // ⚡ Real-Time WebSocket: Lắng nghe nhân viên xin vào và cập nhật danh sách ngay lập tức
    const unsubPendingNew = subscribe('user:pending_new', () => {
      fetchPendingUsers();
    });
    const unsubApproved = subscribe('workspace:member_approved', () => {
      fetchUsers();
      fetchPendingUsers();
    });
    const unsubRejected = subscribe('workspace:member_rejected', () => {
      fetchPendingUsers();
    });

    return () => {
      unsubPendingNew();
      unsubApproved();
      unsubRejected();
    };
  }, [filterRole, subscribe]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, pageSize, activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let url = '/admin/users';
      if (filterRole !== 'ALL') url += `?role=${filterRole}`;
      const res = await api.get(url);
      setUsers(res.data);
    } catch (error) {
      console.error('Lỗi tải danh sách người dùng', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await api.get('/admin/pending-users');
      setPendingUsers(res.data);
    } catch (error) {
      console.error('Lỗi tải danh sách chờ duyệt', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword) return;

    try {
      const res = await api.post('/admin/users', {
        name: createName.trim(),
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        role: createRole,
      });

      setMessage({ text: 'Tạo tài khoản nhân viên thành công!', success: true });
      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      fetchUsers();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi khi tạo tài khoản',
        success: false,
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      setMessage({ text: 'Cập nhật vai trò nhân sự thành công!', success: true });
      fetchUsers();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi khi cập nhật vai trò',
        success: false,
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      await api.post(`/admin/users/${selectedUser.id}/reset-password`, {
        newPassword,
      });

      setMessage({ text: `Đã đổi mật khẩu cho ${selectedUser.name} thành công!`, success: true });
      setShowResetPassModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi đổi mật khẩu',
        success: false,
      });
    }
  };

  const [pendingRowRoles, setPendingRowRoles] = useState<{ [userId: string]: string }>({});

  const handleQuickApprove = async (u: any, targetRole?: string) => {
    const roleToAssign = targetRole || pendingRowRoles[u.id] || 'MEMBER';
    try {
      await api.post(`/admin/pending-users/${u.id}/approve`, {
        role: roleToAssign,
      });
      setMessage({
        text: `Đã duyệt thành công "${u.name}" vào công ty với vai trò ${
          roleToAssign === 'SECRETARY'
            ? '📋 Thư Ký / Trợ Lý Giám Đốc'
            : roleToAssign === 'ADMIN'
            ? '🛡️ Quản Trị Cấp Cao'
            : roleToAssign === 'MANAGER'
            ? '⚡ Trưởng Nhóm / Quản Lý'
            : '👤 Nhân Viên'
        }!`,
        success: true,
      });
      fetchUsers();
      fetchPendingUsers();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi khi phê duyệt thành viên',
        success: false,
      });
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.id === currentUser?.id) {
      alert('Không thể tự xóa tài khoản của chính mình!');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân sự "${user.name}" khỏi công ty?`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${user.id}`);
      setMessage({ text: `Đã xóa nhân viên ${user.name} khỏi hệ thống!`, success: true });
      fetchUsers();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi khi xóa nhân viên',
        success: false,
      });
    }
  };

  // Duyệt tay thành viên mới
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.post(`/admin/pending-users/${selectedUser.id}/approve`, {
        role: approveRole,
      });
      setMessage({ text: `Đã duyệt thành công "${selectedUser.name}" vào công ty!`, success: true });
      setShowApproveModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchPendingUsers();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi khi phê duyệt thành viên',
        success: false,
      });
    }
  };

  // Từ chối thành viên
  const handleReject = async (user: any) => {
    if (!window.confirm(`Từ chối yêu cầu gia nhập của "${user.name}"?`)) return;

    try {
      await api.post(`/admin/pending-users/${user.id}/reject`);
      setMessage({ text: `Đã từ chối yêu cầu của "${user.name}"!`, success: true });
      fetchPendingUsers();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.message || 'Lỗi từ chối',
        success: false,
      });
    }
  };

  // Filter & Pagination Logic
  const currentList = activeTab === 'ACTIVE' ? users : pendingUsers;
  const filteredList = currentList.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Quản Lý Người Dùng & Phê Duyệt Nhân Sự
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
            >
              {users.length} Chính Thức
            </span>
            {pendingUsers.length > 0 && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border animate-pulse ${
                  isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {pendingUsers.length} Chờ Duyệt
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Duyệt tay người mới nhập mã phòng, phân quyền ADMIN / MANAGER / MEMBER, đổi mật khẩu và quản trị nhân sự
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Thêm Nhân Viên Mới
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 ${
            message.success
              ? isLight
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
              : isLight
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Main Tabs: Active vs Pending */}
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl w-fit border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Nhân Sự Chính Thức ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PENDING')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'PENDING'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Yêu Cầu Chờ Duyệt Tay ({pendingUsers.length})</span>
          {pendingUsers.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab === 'ACTIVE' && (
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <option value="ALL">Mọi vai trò</option>
              <option value="ADMIN">🛡️ Quản Trị Cấp Cao (ADMIN)</option>
              <option value="SECRETARY">📋 Thư Ký / Trợ Lý Giám Đốc (SECRETARY)</option>
              <option value="MANAGER">⚡ Trưởng Nhóm / Quản Lý (MANAGER)</option>
              <option value="MEMBER">👤 Nhân Viên Thông Thường (MEMBER)</option>
            </select>
          )}

          <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-lg text-xs focus:outline-none border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <option value={8}>8 người</option>
              <option value={16}>16 người</option>
              <option value={32}>32 người</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: ACTIVE USERS TABLE */}
      {activeTab === 'ACTIVE' && (
        <div className="glass-panel rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'
                }`}
              >
                <tr>
                  <th className="py-3.5 px-4">Nhân Sự</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Vai Trò / Quyền Hạn</th>
                  <th className="py-3.5 px-4">Task Đang Giao</th>
                  <th className="py-3.5 px-4">Tài Sản Đang Giữ</th>
                  <th className="py-3.5 px-4">Ngày Tham Gia</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/80 text-slate-300'}`}>
                {paginatedList.map((u) => {
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr
                      key={u.id}
                      className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {u.name}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded border border-blue-500/30">
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>

                      <td className="py-3.5 px-4">
                        <select
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                            u.role === 'ADMIN'
                              ? 'bg-blue-600/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                              : u.role === 'SECRETARY'
                              ? 'bg-rose-600/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                              : u.role === 'MANAGER'
                              ? 'bg-purple-600/15 border-purple-500/40 text-purple-600 dark:text-purple-400'
                              : isLight
                              ? 'bg-slate-100 border-slate-300 text-slate-700'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          } disabled:opacity-60`}
                        >
                          <option value="ADMIN">🛡️ ADMIN (Sếp)</option>
                          <option value="SECRETARY">📋 SECRETARY (Thư Ký)</option>
                          <option value="MANAGER">⚡ MANAGER (Quản Lý)</option>
                          <option value="MEMBER">👤 MEMBER (Nhân Viên)</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                          {u._count?.assignedTasks || 0} việc
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Laptop className="w-3.5 h-3.5 text-amber-500" />
                          {u._count?.assignedAssets || 0} thiết bị
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setShowResetPassModal(true);
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              isLight
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                            title="Đổi mật khẩu cho nhân viên"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className={`p-1.5 rounded-lg transition ${
                                isLight
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                              }`}
                              title="Xóa nhân viên khỏi hệ thống"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paginatedList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Không tìm thấy nhân sự nào phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING APPROVAL USERS TABLE */}
      {activeTab === 'PENDING' && (
        <div className={`rounded-3xl shadow-xl overflow-hidden border ${isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'
                }`}
              >
                <tr>
                  <th className="py-3.5 px-4">Nhân Sự Chờ Duyệt</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Mã Phòng Nhập</th>
                  <th className="py-3.5 px-4">Chọn Vai Trò (Thư Ký / Nhân Viên...)</th>
                  <th className="py-3.5 px-4 text-right">Quyết Định Duyệt</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/80 text-slate-300'}`}>
                {filteredList.map((u) => {
                  const currentSelectedRole = pendingRowRoles[u.id] || 'MEMBER';
                  return (
                    <tr
                      key={u.id}
                      className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 text-xs shrink-0">
                            {u.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{u.name}</p>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" /> Đang chờ duyệt
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold uppercase px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                          {u.joinCodeUsed || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={currentSelectedRole}
                          onChange={(e) =>
                            setPendingRowRoles({ ...pendingRowRoles, [u.id]: e.target.value })
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none transition cursor-pointer ${
                            currentSelectedRole === 'SECRETARY'
                              ? 'bg-rose-600/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                              : currentSelectedRole === 'ADMIN'
                              ? 'bg-blue-600/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                              : currentSelectedRole === 'MANAGER'
                              ? 'bg-purple-600/15 border-purple-500/40 text-purple-600 dark:text-purple-400'
                              : isLight
                              ? 'bg-slate-50 border-slate-300 text-slate-700'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          <option value="MEMBER">👤 Nhân Viên Thông Thường</option>
                          <option value="SECRETARY">📋 Thư Ký / Trợ Lý Giám Đốc</option>
                          <option value="MANAGER">⚡ Trưởng Nhóm / Quản Lý</option>
                          <option value="ADMIN">🛡️ Quản Trị Cấp Cao (Admin)</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleQuickApprove(u)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5 cursor-pointer"
                            title={`Duyệt vào cty với vai trò ${currentSelectedRole}`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Duyệt Ngay</span>
                          </button>

                          <button
                            onClick={() => handleReject(u)}
                            className={`p-1.5 rounded-xl transition cursor-pointer ${
                              isLight
                                ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title="Từ chối yêu cầu"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Không có yêu cầu xin gia nhập nào đang chờ duyệt
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalItems > pageSize && (
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'}`}>
          <div>
            Hiển thị <strong className={isLight ? 'text-slate-900' : 'text-white'}>{startIndex + 1}</strong> - <strong className={isLight ? 'text-slate-900' : 'text-white'}>{endIndex}</strong> / <strong className="text-blue-600 dark:text-blue-400">{totalItems}</strong> người
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer ${
                isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Trước
            </button>

            <span className={`px-2 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer ${
                isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Duyệt Vào Công Ty */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title={`Phê Duyệt "${selectedUser?.name}" Vào Công Ty`}
      >
        <form onSubmit={handleApprove} className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Bạn đang phê duyệt quyền truy cập phòng làm việc cho <strong className={isLight ? 'text-slate-900' : 'text-white'}>{selectedUser?.name}</strong> ({selectedUser?.email}). Chọn vai trò phù hợp:
          </p>

          <div className="space-y-2">
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Chọn Vai Trò Cho Nhân Sự:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setApproveRole('SECRETARY')}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1 ${
                  approveRole === 'SECRETARY'
                    ? isLight ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40 text-rose-950' : 'bg-rose-600/20 border-rose-500 ring-2 ring-rose-500/40 text-white'
                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    📋 Thư Ký / Trợ Lý
                  </span>
                  {approveRole === 'SECRETARY' && <Check className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-[10px] text-slate-500">Phân công việc & lên lịch họp thay mặt Ban Giám Đốc</p>
              </div>

              <div
                onClick={() => setApproveRole('MEMBER')}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1 ${
                  approveRole === 'MEMBER'
                    ? isLight ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/40 text-blue-950' : 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40 text-white'
                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    👤 Nhân Viên
                  </span>
                  {approveRole === 'MEMBER' && <Check className="w-4 h-4 text-blue-500" />}
                </div>
                <p className="text-[10px] text-slate-500">Nhận việc, làm task và tham gia cuộc họp</p>
              </div>

              <div
                onClick={() => setApproveRole('MANAGER')}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1 ${
                  approveRole === 'MANAGER'
                    ? isLight ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/40 text-purple-950' : 'bg-purple-600/20 border-purple-500 ring-2 ring-purple-500/40 text-white'
                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    ⚡ Trưởng Phòng / Quản Lý
                  </span>
                  {approveRole === 'MANAGER' && <Check className="w-4 h-4 text-purple-500" />}
                </div>
                <p className="text-[10px] text-slate-500">Quản lý công việc và dòng tiền phòng ban</p>
              </div>

              <div
                onClick={() => setApproveRole('ADMIN')}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1 ${
                  approveRole === 'ADMIN'
                    ? isLight ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 text-amber-950' : 'bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/40 text-white'
                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    🛡️ Quản Trị Cấp Cao
                  </span>
                  {approveRole === 'ADMIN' && <Check className="w-4 h-4 text-amber-500" />}
                </div>
                <p className="text-[10px] text-slate-500">Toàn quyền hệ thống & cài đặt</p>
              </div>
            </div>
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowApproveModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Xác Nhận Duyệt Vào Cty
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Thêm Nhân Viên Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Thêm Nhân Viên Mới Trực Tiếp"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Họ và Tên Nhân Viên <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="VD: Trần Đình Huy"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Địa Chỉ Email Đăng Nhập <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="huydev@company.vn"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Mật Khẩu Ban Đầu <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition font-mono border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Vai Trò & Quyền Hạn
            </label>
            <select
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition font-bold border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
              }`}
            >
              <option value="MEMBER">👤 MEMBER (Nhân Viên Thông Thường)</option>
              <option value="SECRETARY">📋 SECRETARY (Thư Ký / Trợ Lý Giám Đốc)</option>
              <option value="MANAGER">⚡ MANAGER (Trưởng Nhóm / Quản Lý)</option>
              <option value="ADMIN">🛡️ ADMIN (Quản Trị Cấp Cao)</option>
            </select>
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Tạo Tài Khoản
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Đặt Lại Mật Khẩu */}
      <Modal
        isOpen={showResetPassModal}
        onClose={() => setShowResetPassModal(false)}
        title={`Đặt Lại Mật Khẩu Cho "${selectedUser?.name}"`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Nhập mật khẩu mới để cấp lại quyền truy cập cho nhân viên này:
          </p>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Mật Khẩu Mới (Tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Nhập mật khẩu mới..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition font-mono border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
              }`}
            />
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowResetPassModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer"
            >
              Xác Nhận Đổi Mật Khẩu
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
