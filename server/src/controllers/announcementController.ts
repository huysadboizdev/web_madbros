import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { SocketService } from '../services/socketService';
import { TelegramService } from '../services/telegramService';

export class AnnouncementController {
  // Lấy danh sách thông báo chung của công ty
  static async getAnnouncements(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;

      const announcements = await prisma.announcement.findMany({
        where: { workspaceId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
        },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return res.json(announcements);
    } catch (error) {
      console.error('[Get Announcements Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tải danh sách thông báo' });
    }
  }

  // Phát thông báo chung mới (Dành cho Admin, Thư Ký hoặc Quản Lý)
  static async createAnnouncement(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const userRole = req.user!.role;

      if (userRole !== 'ADMIN' && userRole !== 'SECRETARY' && userRole !== 'MANAGER') {
        return res.status(403).json({
          message: 'Chỉ Ban Giám Đốc, Thư Ký hoặc Quản Lý mới có quyền phát thông báo chung toàn công ty.',
        });
      }

      const { title, content, priority, pinned, telegramTag } = req.body;

      if (!title || !String(title).trim() || !content || !String(content).trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo' });
      }

      const announcement = await prisma.announcement.create({
        data: {
          title: String(title).trim(),
          content: String(content).trim(),
          priority: priority || 'NORMAL',
          pinned: Boolean(pinned),
          createdById,
          workspaceId,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true, avatar: true },
          },
        },
      });

      // Tạo thông báo chuông Notification cho toàn bộ nhân sự trong Workspace
      const members = await prisma.user.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        select: { id: true },
      });

      const priorityLabel =
        announcement.priority === 'URGENT'
          ? '🚨 [KHẨN CẤP]'
          : announcement.priority === 'IMPORTANT'
          ? '🔥 [QUAN TRỌNG]'
          : '📢';

      for (const member of members) {
        await prisma.notification.create({
          data: {
            userId: member.id,
            title: `${priorityLabel} Thông báo công ty: ${announcement.title}`,
            content: announcement.content.slice(0, 150) + (announcement.content.length > 150 ? '...' : ''),
            type: 'SYSTEM',
          },
        });
      }

      // 🤖 Gửi Thông Báo Qua Telegram (Cả Group và Kênh)
      const roleMap: Record<string, string> = {
        ADMIN: 'Boss',
        SECRETARY: 'Thư Ký',
        MANAGER: 'Quản Lý',
        MEMBER: 'Thành Viên',
      };

      TelegramService.notifyAnnouncementBroadcast({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        senderName: announcement.createdBy.name,
        roleTitle: roleMap[announcement.createdBy.role] || 'Boss',
        telegramTag,
      }).catch((err) => console.error('[Telegram Announcement Broadcast Error]', err));

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'announcement:new', announcement);
      SocketService.emitToWorkspace(workspaceId, 'notification:new', { type: 'SYSTEM' });

      return res.status(201).json({
        message: 'Phát thông báo chung tới toàn công ty và Telegram thành công!',
        announcement,
      });
    } catch (error) {
      console.error('[Create Announcement Error]', error);
      return res.status(500).json({ message: 'Lỗi phát thông báo chung' });
    }
  }

  // Xóa thông báo chung
  static async deleteAnnouncement(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { id } = req.params;
      const userRole = req.user!.role;
      const userId = req.user!.userId;

      const existing = await prisma.announcement.findUnique({
        where: { id: String(id) },
      });

      if (!existing || existing.workspaceId !== workspaceId) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }

      if (userRole !== 'ADMIN' && userRole !== 'SECRETARY' && existing.createdById !== userId) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa thông báo này' });
      }

      await prisma.announcement.delete({
        where: { id: String(id) },
      });

      SocketService.emitToWorkspace(workspaceId, 'announcement:deleted', { id });

      return res.json({ message: 'Đã xóa thông báo thành công' });
    } catch (error) {
      console.error('[Delete Announcement Error]', error);
      return res.status(500).json({ message: 'Lỗi xóa thông báo' });
    }
  }

  // Ghim / Bỏ ghim thông báo
  static async togglePin(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { id } = req.params;
      const userRole = req.user!.role;

      if (userRole !== 'ADMIN' && userRole !== 'SECRETARY' && userRole !== 'MANAGER') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên/Thư ký mới có quyền ghim thông báo' });
      }

      const existing = await prisma.announcement.findUnique({
        where: { id: String(id) },
      });

      if (!existing || existing.workspaceId !== workspaceId) {
        return res.status(404).json({ message: 'Không tìm thấy thông báo' });
      }

      const updated = await prisma.announcement.update({
        where: { id: String(id) },
        data: { pinned: !existing.pinned },
      });

      SocketService.emitToWorkspace(workspaceId, 'announcement:updated', updated);

      return res.json({
        message: updated.pinned ? 'Đã ghim thông báo lên đầu bảng tin' : 'Đã bỏ ghim thông báo',
        announcement: updated,
      });
    } catch (error) {
      console.error('[Toggle Pin Error]', error);
      return res.status(500).json({ message: 'Lỗi thao tác ghim thông báo' });
    }
  }
}
