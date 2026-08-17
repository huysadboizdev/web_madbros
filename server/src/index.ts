import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import meetingRoutes from './routes/meetingRoutes';
import financeRoutes from './routes/financeRoutes';
import notificationRoutes from './routes/notificationRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import statsRoutes from './routes/statsRoutes';
import { bootstrapAdminAccount } from './services/bootstrapService';

const app = express();
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Phục vụ Frontend Static files (Single Port Unified Serving)
const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, './client/dist'),
];

let clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`[Static Serving] Phục vụ Frontend tĩnh từ: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA Fallback cho các router client side
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
} else {
  console.log('[Dev Mode] Chưa tìm thấy client/dist. Chạy client riêng bằng Vite ở chế độ dev.');
  app.get('/', (req, res) => {
    res.send('<h1>MadBros Enterprise API Server Đang Chạy</h1><p>Vui lòng build client (<code>npm run build</code>) để hiển thị giao diện web trên cổng này.</p>');
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Hệ Thống Quản Lý MadBros Đang Chạy Thành Công!`);
  console.log(`🌐 Cổng: http://localhost:${PORT}`);
  console.log(`📌 Môi trường: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);

  // Tự động kiểm tra và khởi tạo tài khoản Admin từ .env
  await bootstrapAdminAccount();
});
