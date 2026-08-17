import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  DollarSign,
  Settings,
  Bell,
  LogOut,
  Copy,
  Check,
  Building2,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showBellMenu, setShowBellMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBellMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = () => {
    if (user?.workspaceCode) {
      navigator.clipboard.writeText(user.workspaceCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tasks', label: 'Công Việc', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'meetings', label: 'Lịch Họp', icon: <Calendar className="w-4 h-4" /> },
    { id: 'finance', label: 'Dòng Tiền', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'settings', label: 'Cài Đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Workspace Info */}
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-white tracking-tight">
                  MAD<span className="text-blue-500">BROS</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium truncate max-w-[140px] sm:max-w-[200px]">
                    {user?.workspaceName}
                  </span>
                </div>
              </div>
            </div>

            {/* Invite Code Badge */}
            {user?.workspaceCode && (
              <button
                onClick={handleCopyCode}
                title="Sao chép mã mời nhân viên"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 text-xs text-slate-300 hover:text-white transition group"
              >
                <span className="text-slate-400">Mã nhóm:</span>
                <span className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                  {user.workspaceCode}
                </span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
                )}
              </button>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Notifications + Profile */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setShowBellMenu(!showBellMenu)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showBellMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      Thông Báo
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full font-medium">
                          {unreadCount} mới
                        </span>
                      )}
                    </h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>

                  <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500">
                        Không có thông báo nào
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markAsRead(n.id);
                            if (n.type === 'MEETING') setActiveTab('meetings');
                            if (n.type === 'TASK') setActiveTab('tasks');
                            setShowBellMenu(false);
                          }}
                          className={`p-3 rounded-xl transition cursor-pointer ${
                            n.isRead
                              ? 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/60'
                              : 'bg-blue-950/40 border border-blue-500/30 text-slate-200 hover:bg-blue-950/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-slate-100">{n.title}</span>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {new Date(n.createdAt).toLocaleDateString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300 line-clamp-2">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                  {user?.name}
                </p>
                <p className="text-[10px] text-blue-400 font-semibold uppercase">
                  {user?.role === 'ADMIN' ? 'Quản Trị' : user?.role === 'MANAGER' ? 'Trưởng Nhóm' : 'Thành Viên'}
                </p>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-800 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
