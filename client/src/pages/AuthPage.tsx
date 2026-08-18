import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthPage: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<any>(null);

  const googleClientId =
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    '652476813264-h27hsfs8belava44flh6msj8kstgov55.apps.googleusercontent.com';

  // Khởi tạo Google Identity Services & OAuth2 Token Client
  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts) return;

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('[Google OAuth Error]', tokenResponse.error);
              setError('Đăng nhập Google bị hủy hoặc gặp lỗi');
              setLoading(false);
              return;
            }

            if (tokenResponse.access_token) {
              try {
                setLoading(true);
                setError(null);
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await userInfoRes.json();

                await googleLogin({
                  email: profile.email,
                  name: profile.name,
                  avatar: profile.picture,
                });
              } catch (err: any) {
                console.error('[Google Profile Error]', err);
                setError(err.response?.data?.message || 'Lỗi khi lấy thông tin Google');
              } finally {
                setLoading(false);
              }
            }
          },
        });
      } catch (err) {
        console.warn('[Google Init Error]', err);
      }
    };

    if (window.google?.accounts) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(interval);
          initGoogle();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  const handleGoogleCredentialResponse = async (response: any) => {
    try {
      setLoading(true);
      setError(null);
      await googleLogin({ credential: response.credential });
    } catch (err: any) {
      console.error('[Google Login Error]', err);
      setError(err.response?.data?.message || 'Lỗi xác thực Google');
    } finally {
      setLoading(false);
    }
  };

  const triggerGoogleLogin = () => {
    setError(null);

    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Đang kết nối tới máy chủ Google, vui lòng nhấp lại sau vài giây...');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

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

      {/* Background ambient lighting effects */}
      <div className="ambient-glow-blue" />
      <div className="ambient-glow-purple" />
      <div className="ambient-glow-emerald" />

      {/* Main Glass Login Card */}
      <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-300">
        <div
          className={`p-5 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border shadow-2xl space-y-5 sm:space-y-6 relative overflow-hidden backdrop-blur-2xl transition-all ${
            isLight
              ? 'bg-white/95 border-slate-200 shadow-slate-200/80 text-slate-900'
              : 'bg-slate-900/90 border-slate-700/80 shadow-black/60 text-slate-100'
          }`}
        >
          {/* Top Company Logo & Brand Header */}
          <div className="text-center space-y-3">
            <div
              className={`mx-auto w-20 h-20 rounded-3xl p-3 shadow-xl flex items-center justify-center group transition hover:scale-105 border ${
                isLight
                  ? 'bg-blue-50 border-blue-200 shadow-blue-500/10'
                  : 'bg-slate-800 border-slate-700 shadow-blue-500/20'
              }`}
            >
              <img
                src="/logo.png"
                alt="MadBros Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>

            <div>
              <h1
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center justify-center gap-2 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                MAD<span className="text-blue-500">BROS</span>
                <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                  ENTERPRISE
                </span>
              </h1>
              <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Hệ thống Quản Trị Công Việc, Lịch Họp & Tài Sản Doanh Nghiệp
              </p>
            </div>
          </div>

          {/* Google 1-Click Sign-In Section */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={triggerGoogleLogin}
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-md'
                  : 'bg-white hover:bg-slate-100 text-slate-900 shadow-xl shadow-white/10'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Đang xác thực Google...' : 'Đăng nhập nhanh với Google'}</span>
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className={`border-t w-full ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />
              <span
                className={`px-3 text-[11px] font-semibold uppercase tracking-wider shrink-0 ${
                  isLight ? 'bg-white text-slate-400' : 'bg-[#0f172a] text-slate-500'
                }`}
              >
                HOẶC TIẾP TỤC VỚI EMAIL
              </span>
              <div className={`border-t w-full ${isLight ? 'border-slate-200' : 'border-slate-800'}`} />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Single Secure Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Địa Chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@madbros.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm placeholder-slate-400 focus:outline-none transition shadow-inner border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                      : 'bg-slate-900/80 border-slate-700/80 text-white focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Mật Khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm placeholder-slate-400 focus:outline-none transition font-mono shadow-inner border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                      : 'bg-slate-900/80 border-slate-700/80 text-white focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-xl shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Enterprise Security Footer */}
          <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Xác thực bảo mật Zero-Trust & Mã hóa kết nối SSL/TLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
