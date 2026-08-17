import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AdminDashboard } from './AdminDashboard';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminTasksPage } from './AdminTasksPage';
import { AdminMeetingsPage } from './AdminMeetingsPage';
import { WorkspacePage } from '../pages/WorkspacePage';
import { SecretaryPage } from '../pages/SecretaryPage';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  Users,
  CheckSquare,
  Calendar,
  Settings,
  LayoutDashboard,
  ArrowLeftRight,
  LogOut,
  Crown,
  FileSignature,
} from 'lucide-react';

interface AdminLayoutProps {
  onSwitchToMemberPortal: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onSwitchToMemberPortal }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const getInitialAdminTab = () => {
    const params = new URLSearchParams(window.location.search);
    const admin = params.get('admin');
    if (admin && ['dashboard', 'secretary', 'users', 'tasks', 'meetings', 'settings'].includes(admin)) {
      return admin;
    }
    return 'dashboard';
  };

  const [activeAdminTab, setActiveAdminTab] = useState(getInitialAdminTab);

  const handleAdminTabChange = (tab: string) => {
    setActiveAdminTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'dashboard') {
      url.searchParams.delete('admin');
    } else {
      url.searchParams.set('admin', tab);
    }
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'secretary', label: 'Ban Thư Ký', icon: <FileSignature className="w-3.5 h-3.5" /> },
    { id: 'users', label: 'Nhân Sự', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'tasks', label: 'Công Việc', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'meetings', label: 'Lịch Họp', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'Cài Đặt', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-amber-500 selection:text-slate-950 relative overflow-x-clip transition-colors duration-300 ${
        isLight ? 'bg-[#f4f7fb] text-slate-800' : 'bg-[#050811] text-slate-100'
      }`}
    >
      {/* Ambient background glows */}
      <div className="ambient-glow-purple" />
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-emerald" />

      {/* Admin Executive Top Navbar (Sticky Floating) */}
      <header
        className={`sticky top-0 z-50 w-full backdrop-blur-2xl border-b transition-all duration-300 ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-md shadow-slate-200/60'
            : 'bg-slate-950/90 border-amber-500/20 shadow-xl shadow-black/50'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 py-2">
            {/* Left: Brand Logo & Workspace */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => setActiveAdminTab('dashboard')}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl p-1.5 shadow-lg group-hover:scale-105 transition-all duration-300 flex items-center justify-center shrink-0 border ${
                    isLight
                      ? 'bg-white border-amber-300 shadow-amber-500/10'
                      : 'bg-slate-900 border-amber-500/30 shadow-amber-500/20'
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
                      MAD<span className="text-amber-500">BROS</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm border ${
                        isLight
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <Crown className="w-2.5 h-2.5" /> BOSS
                    </span>
                  </div>
                  <p className={`text-[11px] font-medium truncate max-w-[130px] sm:max-w-[200px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {user?.workspaceName}
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Admin Nav Items */}
            <nav
              className={`hidden lg:flex items-center space-x-1 p-1 rounded-2xl border shadow-inner ${
                isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-900/80 border-slate-800/80'
              }`}
            >
              {navItems.map((item) => {
                const isActive = activeAdminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAdminTabChange(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 font-extrabold'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right: Switch Portal Button & Theme & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Switcher */}
              <ThemeToggle />

              <button
                onClick={onSwitchToMemberPortal}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm hover:scale-105 border ${
                  isLight
                    ? 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border-blue-200 hover:border-blue-600'
                    : 'bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-500/30'
                }`}
                title="Chuyển sang giao diện làm việc thông thường"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cổng Nhân Viên</span>
              </button>

              <div className={`hidden md:flex items-center gap-2 pl-2.5 border-l ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                    isLight
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-slate-800 text-amber-400 border-slate-700'
                  }`}
                >
                  {user?.name?.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold leading-tight truncate max-w-[120px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {user?.name}
                  </p>
                  <p className={`text-[10px] font-semibold uppercase ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {user?.role}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className={`p-2 rounded-xl transition ${
                  isLight
                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                }`}
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile/Tablet Horizontal Scroll Nav */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none pt-1">
            {navItems.map((item) => {
              const isActive = activeAdminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleAdminTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                      : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Admin Page Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 z-10">
        {activeAdminTab === 'dashboard' && (
          <AdminDashboard setActiveAdminTab={handleAdminTabChange} />
        )}
        {activeAdminTab === 'secretary' && <SecretaryPage />}
        {activeAdminTab === 'users' && <AdminUsersPage />}
        {activeAdminTab === 'tasks' && <AdminTasksPage />}
        {activeAdminTab === 'meetings' && <AdminMeetingsPage />}
        {activeAdminTab === 'settings' && <WorkspacePage />}
      </main>

      {/* Admin Footer */}
      <footer
        className={`py-5 border-t backdrop-blur-md text-xs z-10 transition-colors duration-300 ${
          isLight
            ? 'bg-white/90 border-slate-200 text-slate-500'
            : 'bg-slate-950/80 border-slate-800/80 text-slate-500'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className={`font-medium ${isLight ? 'text-amber-800' : 'text-amber-400/90'}`}>
              Trung tâm Quản trị Cấp cao đang hoạt động
            </span>
          </div>
          <p>© 2026 MadBros Enterprise Boss Portal. Bản quyền quản trị bảo mật cao.</p>
        </div>
      </footer>
    </div>
  );
};
