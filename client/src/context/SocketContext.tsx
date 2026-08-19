import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { Bell, CheckCircle2, AlertCircle, Calendar, Sparkles, X } from 'lucide-react';

interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'TASK' | 'MEETING' | 'APPROVAL' | 'INFO';
  link?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  playChime: () => void;
  showToast: (toast: Omit<ToastData, 'id'>) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Web Audio API để phát âm thanh chuông "Ding" nhẹ nhàng, thanh thoát mà không cần file MP3
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15); // A6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6
    osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Ignore audio permission restrictions if user hasn't interacted
  }
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, refreshUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
    playNotificationSound();

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Kết nối đến backend WebSocket với dynamic token callback
    const newSocket = io(window.location.origin, {
      auth: (cb) => {
        const currentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        cb({ token: currentToken });
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('⚡ [Socket Connected] Đã thiết lập liên lạc Real-time 2 chiều');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 [Socket Disconnected]', reason);
      setIsConnected(false);
    });

    // Tự động xử lý khi WebSocket bị lỗi xác thực do Token hết hạn
    newSocket.on('connect_error', async (err) => {
      if (err.message === 'TokenExpiredError' || err.message?.toLowerCase().includes('expired') || err.message?.toLowerCase().includes('token')) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            console.log('⚡ [Socket Auth] Token hết hạn, đang tự động gia hạn phiên đăng nhập...');
            const res = await axios.post('/api/auth/refresh', { refreshToken });
            const { accessToken: newAccess, refreshToken: newRefresh, user: newUser } = res.data;
            if (newAccess) {
              localStorage.setItem('accessToken', newAccess);
              localStorage.setItem('token', newAccess);
              if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
              if (newUser) localStorage.setItem('user', JSON.stringify(newUser));

              window.dispatchEvent(new CustomEvent('auth:token-refreshed', {
                detail: { accessToken: newAccess, refreshToken: newRefresh, user: newUser },
              }));

              newSocket.auth = { token: newAccess };
              newSocket.connect();
            }
          } catch (refreshErr) {
            console.warn('⚡ [Socket Auth] Gia hạn phiên thất bại, vui lòng đăng nhập lại.');
          }
        }
      }
    });

    // Lắng nghe sự kiện token được làm mới từ HTTP Interceptor
    const handleTokenRefreshed = (e: any) => {
      const newToken = e.detail?.accessToken;
      if (newToken && socketRef.current) {
        socketRef.current.auth = { token: newToken };
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    };
    window.addEventListener('auth:token-refreshed', handleTokenRefreshed);

    // Lắng nghe sự kiện tài khoản được phê duyệt -> Tự động mở khóa ngay lập tức
    newSocket.on('user:approved', (data) => {
      console.log('🎉 [Real-Time] Tài khoản của bạn đã được Quản trị viên duyệt!', data);
      showToast({
        title: 'Tài Khoản Đã Được Phê Duyệt! 🎉',
        message: 'Chào mừng bạn đến với phòng làm việc công ty.',
        type: 'APPROVAL',
      });
      refreshUser();
    });

    // Lắng nghe thông báo tạo task mới
    newSocket.on('task:created', (data) => {
      if (data.assigneeIds?.includes(user.id)) {
        showToast({
          title: 'Công Việc Mới Được Giao 📋',
          message: `Bạn vừa được giao việc: "${data.title}"`,
          type: 'TASK',
        });
      }
    });

    // Lắng nghe thông báo lịch họp mới
    newSocket.on('meeting:created', (data) => {
      showToast({
        title: 'Cuộc Họp Mới 📅',
        message: `Lịch họp mới: "${data.title}"`,
        type: 'MEETING',
      });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      window.removeEventListener('auth:token-refreshed', handleTokenRefreshed);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!socketRef.current) {
      return () => {};
    }
    const currentSocket = socketRef.current;
    currentSocket.on(event, handler);
    return () => {
      currentSocket.off(event, handler);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        subscribe,
        playChime: playNotificationSound,
        showToast,
      }}
    >
      {children}

      {/* Floating Real-Time Toast Notifications */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl text-white flex items-start gap-3 animate-in slide-in-from-top-5 duration-300 transition-all"
          >
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
              {toast.type === 'TASK' ? (
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              ) : toast.type === 'MEETING' ? (
                <Calendar className="w-5 h-5 text-purple-400" />
              ) : toast.type === 'APPROVAL' ? (
                <Sparkles className="w-5 h-5 text-emerald-400" />
              ) : (
                <Bell className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white mb-0.5">{toast.title}</h5>
              <p className="text-[11px] text-slate-300 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-0.5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
