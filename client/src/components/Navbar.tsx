import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { copyTextToClipboard } from '../utils/clipboard';
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
  Menu,
  X,
  Crown,
  FileSignature,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchToAdminPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onSwitchToAdminPortal }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [showBellMenu, setShowBellMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isSecretaryOrAdmin = user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'MANAGER';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowBellMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = async () => {
    if (user?.workspaceCode) {
      const ok = await copyTextToClipboard(user.workspaceCode);
      if (ok) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    ...(isSecretaryOrAdmin
      ? [{ id: 'secretary', label: 'Thư Ký & Trợ Lý', icon: <FileSignature className="w-3.5 h-3.5" /> }]
      : []),
    { id: 'tasks', label: 'Công Việc', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'meetings', label: 'Lịch Họp', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'settings', label: user?.role === 'ADMIN' ? 'Cài Đặt' : 'Workspace', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-2xl border-b transition-colors duration-300 ${
        isLight
          ? 'bg-white/90 border-slate-200 shadow-md shadow-slate-200/50'
          : 'bg-slate-950/85 border-white/[0.08] shadow-lg shadow-black/25'
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 py-2">
          {/* Left: Logo & Workspace Info */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => setActiveTab('dashboard')}
            >
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl p-1.5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-300 shrink-0 border ${
                  isLight
                    ? 'bg-white border-blue-200 shadow-blue-500/10'
                    : 'bg-slate-900 border-slate-700/80 shadow-blue-500/20'
                }`}
              >
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-extrabold text-base sm:text-lg tracking-tight ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    MAD<span className="text-blue-500">BROS</span>
                  </span>
                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30 tracking-wider">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium truncate max-w-[130px] sm:max-w-[200px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {user?.workspaceName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav
            className={`hidden lg:flex items-center space-x-1 p-1 rounded-2xl border shadow-inner ${
              isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-900/80 border-slate-800/80'
            }`}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-extrabold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Theme + Boss Portal + Notifications + User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Boss Portal Shortcut Button */}
            {onSwitchToAdminPortal && isAdminOrManager && (
              <button
                onClick={onSwitchToAdminPortal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-md shadow-amber-500/25 transition-all hover:scale-105"
                title="Mở Cổng Quản Trị Cấp Cao Dành Cho Boss"
              >
                <Crown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cổng Boss</span>
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setShowBellMenu(!showBellMenu)}
                className={`relative p-2 rounded-xl border transition-all ${
                  showBellMenu
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-500'
                    : isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Thông báo hệ thống"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/50 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showBellMenu && (
                <div
                  className={`absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
                    isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-700/80 text-slate-100'
                  }`}
                >
                  <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <h4 className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      Thông Báo
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-500 rounded-full font-bold border border-blue-500/30">
                          {unreadCount} mới
                        </span>
                      )}
                    </h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold transition cursor-pointer"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>

                  <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <p className={`text-center py-8 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        Không có thông báo nào
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markAsRead(n.id);
                            if (n.link?.includes('/tasks')) setActiveTab('tasks');
                            if (n.link?.includes('/meetings')) setActiveTab('meetings');
                            setShowBellMenu(false);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                            n.isRead
                              ? isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-500'
                                : 'bg-slate-800/40 border-slate-800 text-slate-400'
                              : isLight
                              ? 'bg-blue-50/70 border-blue-200 text-slate-800'
                              : 'bg-blue-950/40 border-blue-500/30 text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              n.isRead ? 'bg-slate-400' : 'bg-blue-500 animate-pulse'
                            }`}
                          />
                          <div className="flex-1 space-y-1">
                            <p className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{n.title}</p>
                            <p className={`text-[11px] leading-relaxed line-clamp-2 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                              {n.content}
                            </p>
                            <span className="text-[10px] text-slate-400 block pt-0.5">
                              {new Date(n.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              - {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1 sm:pr-2.5 rounded-2xl border transition group cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 hover:bg-slate-200'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-600/25">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className={`text-xs font-bold transition leading-tight truncate max-w-[120px] ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                    {user?.role === 'ADMIN' ? '🛡️ Quản Trị' : user?.role === 'MANAGER' ? '⚡ Trưởng Phòng' : '👤 Nhân Viên'}
                  </p>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div
                  className={`absolute right-0 mt-3 w-60 rounded-2xl border shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
                    isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/95 border-slate-700/80 text-slate-100'
                  }`}
                >
                  <div className={`p-2 border-b mb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <p className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  {isAdminOrManager && onSwitchToAdminPortal && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onSwitchToAdminPortal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl transition mb-1 cursor-pointer"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      Vào Cổng Quản Trị Boss
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition cursor-pointer ${
                      isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Cài Đặt Workspace
                  </button>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition mt-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    Đăng Xuất
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setShowMobileNav(!showMobileNav)}
              className={`lg:hidden p-2 rounded-xl border ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {showMobileNav ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {showMobileNav && (
          <div className={`lg:hidden py-3 border-t space-y-1 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowMobileNav(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white font-bold'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
