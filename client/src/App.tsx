import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthPage } from './pages/AuthPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { FinancePage } from './pages/FinancePage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SecretaryPage } from './pages/SecretaryPage';
import { AdminLayout } from './admin/AdminLayout';
import { useTheme } from './context/ThemeContext';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  // Read initial tab from URL params if available
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['dashboard', 'secretary', 'tasks', 'meetings', 'finance', 'settings'].includes(tab)) {
      return tab;
    }
    return user?.role === 'SECRETARY' ? 'secretary' : 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [portalMode, setPortalMode] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'dashboard') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  // Tự động nhận diện vai trò và dọn dẹp URL khi đăng nhập:
  // - Nếu URL đang là /login và đã đăng nhập -> chuyển về URL chuẩn /
  // - Nếu là Admin / Manager: Mặc định Cổng Quản Trị Boss (AdminLayout)
  // - Nếu là Member / Secretary: Mặc định vào Cổng Làm Việc
  useEffect(() => {
    if (user) {
      if (window.location.pathname === '/login') {
        window.history.replaceState({}, document.title, window.location.search || '/');
      }

      if (user.status === 'ACTIVE' && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
        setPortalMode('ADMIN');
      } else {
        setPortalMode('MEMBER');
        if (user.role === 'SECRETARY') {
          setActiveTab((prev) => (prev === 'dashboard' ? 'secretary' : prev));
        } else if (user.role === 'MEMBER') {
          // Nhân viên thường KHÔNG được ở tab secretary hoặc finance
          setActiveTab((prev) => (prev === 'secretary' || prev === 'finance' ? 'dashboard' : prev));
        }
      }
    }
  }, [user?.id, user?.role, user?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060913] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Đang tải hệ thống MadBros Enterprise...</p>
        </div>
      </div>
    );
  }

  // 1. Chưa đăng nhập -> Vào trang đăng nhập duy nhất
  if (!user) {
    return <AuthPage />;
  }

  // 2. Tài khoản mới chưa được duyệt -> Vào màn hình cách ly bảo mật (Nhập mã phòng & Chờ Admin duyệt)
  if (user.status === 'PENDING_APPROVAL') {
    return <PendingApprovalPage />;
  }

  // 3. Nếu là Admin/Boss trong chế độ Admin Portal
  if (portalMode === 'ADMIN' && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
    return <AdminLayout onSwitchToMemberPortal={() => setPortalMode('MEMBER')} />;
  }

  // Quyền truy cập các tab
  const canAccessSecretary = user.role === 'SECRETARY' || user.role === 'ADMIN' || user.role === 'MANAGER';
  const canAccessFinance = user.role === 'ADMIN' || user.role === 'MANAGER';

  // 4. Mặc định: Phòng làm việc của công ty dành cho Nhân Viên / Thư Ký đã duyệt
  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden transition-colors duration-300 ${
        isLight ? 'bg-[#f4f7fb] text-slate-800' : 'bg-[#060913] text-slate-100'
      }`}
    >
      {/* Background ambient lighting effects */}
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-purple" />
      <div className="ambient-glow-emerald" />

      {/* Top Navbar with Admin Portal Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSwitchToAdminPortal={() => setPortalMode('ADMIN')}
      />

      {/* Main Page Content - Compact & Responsive Widescreen Container */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 z-10">
        {(activeTab === 'dashboard' ||
          (activeTab === 'secretary' && !canAccessSecretary) ||
          (activeTab === 'finance' && !canAccessFinance)) && (
          <DashboardPage setActiveTab={handleTabChange} />
        )}
        {activeTab === 'secretary' && canAccessSecretary && <SecretaryPage />}
        {activeTab === 'tasks' && <TasksPage />}
        {activeTab === 'meetings' && <MeetingsPage />}
        {activeTab === 'finance' && canAccessFinance && <FinancePage />}
        {activeTab === 'settings' && <WorkspacePage />}
      </main>

      {/* Footer */}
      <footer
        className={`py-5 border-t text-xs z-10 transition-colors duration-300 ${
          isLight
            ? 'bg-white/90 border-slate-200 text-slate-500 shadow-inner'
            : 'border-slate-800/80 bg-slate-950/80 text-slate-400'
        }`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Hệ thống đang hoạt động tối ưu</span>
          </div>
          <p>© 2026 MadBros Enterprise System. Vận hành chuyên nghiệp trên Windows Server.</p>
        </div>
      </footer>
    </div>
  );
};

import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
