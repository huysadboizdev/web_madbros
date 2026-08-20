import express from 'express';
import http from 'http';
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
import adminRoutes from './routes/adminRoutes';
import announcementRoutes from './routes/announcementRoutes';
import { bootstrapAdminAccount } from './services/bootstrapService';
import { SocketService } from './services/socketService';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 80;

// Initialize Real-time Socket.IO Engine
SocketService.init(server);

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
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);

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
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ message: 'Lỗi máy chủ nội bộ', error: err.message });
});

server.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Hệ Thống Quản Lý MadBros Đang Chạy Thành Công!`);
  console.log(`🌐 Cổng: http://localhost:${PORT}`);
  console.log(`📌 Môi trường: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ WebSocket: Sẵn sàng kết nối Real-time`);
  console.log(`====================================================`);

  // Tự động khởi tạo hoặc đồng bộ tài khoản Admin từ .env
  await bootstrapAdminAccount();

});
