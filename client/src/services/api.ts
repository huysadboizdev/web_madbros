import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn accessToken vào request headers nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag và hàng đợi các request đang chờ refresh token hoàn thành
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Xử lý tự động khi Access Token hết hạn bằng Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu trả về lỗi 401 Unauthorized và request chưa từng được thử lại
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthRoute =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/google') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthRoute) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Đưa request vào hàng đợi chờ refresh token xong
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken, user } = res.data;

        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('token', accessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
