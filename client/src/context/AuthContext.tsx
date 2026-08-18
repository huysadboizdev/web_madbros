import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'BLOCKED';
  joinCodeUsed?: string | null;
  avatar?: string;
  workspaceId: string;
  workspaceName: string;
  workspaceCode: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  googleLogin: (data: { credential?: string; email?: string; name?: string; avatar?: string }) => Promise<void>;
  requestJoinWorkspace: (code: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken') || localStorage.getItem('token'));
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('accessToken') || localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!currentToken) {
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (error) {
      console.error('Lỗi lấy thông tin user', error);
      // Nếu có refresh token, api interceptor sẽ tự refresh; nếu cả refresh token cũng hỏng thì mới logout
      if (!localStorage.getItem('refreshToken')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Lắng nghe sự kiện logout tự động từ api interceptor khi refresh token hết hạn
    const handleAutoLogout = () => {
      logout();
    };
    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    const { accessToken: newAccess, refreshToken: newRefresh, token: newToken, user: newUser } = res.data;
    const finalAccess = newAccess || newToken;

    setToken(finalAccess);
    setAccessToken(finalAccess);
    setRefreshToken(newRefresh || null);
    setUser(newUser);

    localStorage.setItem('accessToken', finalAccess);
    localStorage.setItem('token', finalAccess);
    if (newRefresh) {
      localStorage.setItem('refreshToken', newRefresh);
    }
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const googleLogin = async (data: { credential?: string; email?: string; name?: string; avatar?: string }) => {
    const res = await api.post('/auth/google', data);
    const { accessToken: newAccess, refreshToken: newRefresh, token: newToken, user: newUser } = res.data;
    const finalAccess = newAccess || newToken;

    setToken(finalAccess);
    setAccessToken(finalAccess);
    setRefreshToken(newRefresh || null);
    setUser(newUser);

    localStorage.setItem('accessToken', finalAccess);
    localStorage.setItem('token', finalAccess);
    if (newRefresh) {
      localStorage.setItem('refreshToken', newRefresh);
    }
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const requestJoinWorkspace = async (code: string) => {
    const res = await api.post('/workspaces/request-join', { code });
    const { user: updatedUser } = res.data;
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setToken(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        accessToken,
        refreshToken,
        loading,
        login,
        googleLogin,
        requestJoinWorkspace,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
