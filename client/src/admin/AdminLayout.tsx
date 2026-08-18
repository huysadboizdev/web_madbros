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
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

interface AdminLayoutProps {
  onSwitchToMemberPortal: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onSwitchToMemberPortal }) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    setIsMobileMenuOpen(false);
    const url = new URL(window.location.href);
    if (tab === 'dashboard') {
      url.searchParams.delete('admin');
    } else {
      url.searchParams.set('admin', tab);
    }
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  const navItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'secretary', label: 'Ban Thư Ký', icon: <FileSignature className="w-4 h-4" /> },
    { id: 'users', label: 'Nhân Sự', icon: <Users className="w-4 h-4" /> },
    { id: 'tasks', label: 'Công Việc', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'meetings', label: 'Lịch Họp', icon: <Calendar className="w-4 h-4" /> },
    { id: 'settings', label: 'Cài Đặt', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-blue-600 selection:text-white relative transition-colors duration-300 ${
        isLight ? 'bg-[#f4f7fb] text-slate-800' : 'bg-[#0B0F19] text-slate-100'
      }`}
    >
      {/* Ambient background glows */}
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-purple" />
      <div className="ambient-glow-emerald" />

      {/* Admin Executive Top Navbar (Cố định đỉnh màn hình chuẩn Responsive Web) */}
      <header
        className={`w-full fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-sm'
            : 'bg-[#0B0F19]/95 border-blue-500/20 shadow-lg shadow-black/50'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 py-2">
            {/* Left: Brand Logo & Workspace */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => handleAdminTabChange('dashboard')}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl p-1.5 shadow-lg group-hover:scale-105 transition-all duration-300 flex items-center justify-center shrink-0 border ${
                    isLight
                      ? 'bg-white border-blue-200 shadow-blue-500/10'
                      : 'bg-slate-900 border-blue-500/30 shadow-blue-500/20'
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
                    <span
                      className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm border ${
                        isLight
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                      }`}
                    >
                      <Crown className="w-2.5 h-2.5 text-blue-400" /> BOSS
                    </span>
                  </div>
                  <p className={`text-[11px] font-medium truncate max-w-[120px] sm:max-w-[200px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {user?.workspaceName || 'Trụ sở điều hành'}
                  </p>
                </div>
              </div>
            </div>

            {/* Center: Admin Desktop Nav Items (>= 1024px) */}
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-600/30 font-extrabold'
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

            {/* Right: Actions + Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Theme Switcher */}
              <ThemeToggle />

              {/* Switch to Member Portal */}
              <button
                onClick={onSwitchToMemberPortal}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm hover:scale-105 border cursor-pointer ${
                  isLight
                    ? 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border-blue-200 hover:border-blue-600'
                    : 'bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border-blue-500/30'
                }`}
                title="Chuyển sang giao diện làm việc thông thường"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cổng Nhân Viên</span>
              </button>

              {/* Admin Profile Chip (>= 768px) */}
              <div className={`hidden md:flex items-center gap-2 pl-2.5 border-l ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs border ${
                    isLight
                      ? 'bg-blue-100 text-blue-900 border-blue-200'
                      : 'bg-blue-950/60 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {user?.name?.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold leading-tight truncate max-w-[110px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {user?.name}
                  </p>
                  <p className={`text-[10px] font-semibold uppercase ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                    {user?.role}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isLight
                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                }`}
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Responsive Hamburger Menu Button (< 1024px) */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden p-2 rounded-xl border transition-all cursor-pointer ${
                  isMobileMenuOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                aria-label="Mở menu quản trị"
                title="Mở menu quản trị"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Navigation Drawer (< 1024px) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide Drawer */}
          <div
            className={`fixed top-0 right-0 bottom-0 w-full max-w-[300px] sm:max-w-[340px] z-50 p-5 flex flex-col justify-between border-l shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#0B0F19] border-blue-500/20 text-white'
            }`}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 p-1 flex items-center justify-center">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm tracking-tight">
                      MAD<span className="text-blue-500">BROS</span> BOSS
                    </span>
                    <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                      {user?.workspaceName || 'Trụ sở quản trị'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation List */}
              <div className="py-4 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
                  Phân Hệ Quản Trị
                </p>
                {navItems.map((item) => {
                  const isActive = activeAdminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAdminTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 font-extrabold'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className={`p-1.5 rounded-xl ${isActive ? 'bg-white/20' : isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                        {item.icon}
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer User Card */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
              }`}>
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name?.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{user?.name}</p>
                  <p className="text-[10px] text-blue-500 font-semibold">{user?.role} • {user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSwitchToMemberPortal();
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                    isLight
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-blue-900/30 border-blue-500/30 text-blue-300 hover:bg-blue-800/40'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Cổng Thường</span>
                </button>

                <button
                  onClick={logout}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                    isLight
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-rose-900/30 border-rose-500/30 text-rose-300 hover:bg-rose-800/40'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin Page Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-22 lg:pt-24 pb-12 sm:pb-16 z-10">
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
            : 'bg-[#0B0F19]/80 border-slate-800/80 text-slate-500'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className={`font-medium ${isLight ? 'text-blue-800' : 'text-blue-400/90'}`}>
              Trung tâm Quản trị Cấp cao MadBros đang hoạt động
            </span>
          </div>
          <p>© 2026 MadBros Enterprise Boss Portal. Bản quyền quản trị bảo mật cao.</p>
        </div>
      </footer>
    </div>
  );
};
