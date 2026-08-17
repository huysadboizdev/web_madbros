import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

export class NotificationController {
  static async getMyNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      return res.json({ notifications, unreadCount });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi tải thông báo' });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = req.user!.userId;

      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });

      return res.json({ message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
    }
  }
}
