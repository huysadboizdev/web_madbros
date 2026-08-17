import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';
import { SocketService } from '../services/socketService';
import { TelegramService } from '../services/telegramService';

export class WorkspaceController {
  // Người dùng mới gửi yêu cầu gia nhập Workspace bằng mã phòng
  static async requestJoin(req: AuthenticatedRequest, res: Response) {
    try {
      const { code } = req.body;
      const userId = req.user!.userId;

      if (!code || !String(code).trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập mã phòng công ty' });
      }

      const formattedCode = String(code).trim().toUpperCase();
      const workspace = await prisma.workspace.findUnique({
        where: { code: formattedCode },
      });

      if (!workspace) {
        return res.status(404).json({ message: 'Mã phòng công ty không chính xác hoặc không tồn tại' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          workspaceId: workspace.id,
          joinCodeUsed: formattedCode,
          status: 'PENDING_APPROVAL',
          requestedAt: new Date(),
        },
        include: { workspace: true },
      });

      // Tạo thông báo cho các Admin trong workspace
      const admins = await prisma.user.findMany({
        where: { workspaceId: workspace.id, role: 'ADMIN' },
        select: { id: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Yêu cầu gia nhập phòng mới ⚡',
            content: `Nhân viên "${updatedUser.name}" (${updatedUser.email}) vừa nhập mã phòng "${formattedCode}" và đang chờ bạn phê duyệt vào công ty.`,
            type: 'SYSTEM',
          },
        });
      }

      // 🤖 Tự động bắn thông báo Telegram khi có người mới xin vào công ty
      TelegramService.notifyUserJoinRequest({
        userName: updatedUser.name,
        userEmail: updatedUser.email,
        roomCode: formattedCode,
      }).catch((err) => console.error('[Telegram Join Notify Error]', err));

      // ⚡ Real-Time WebSocket: Báo cho Admin biết có nhân viên mới xin vào phòng
      SocketService.emitToWorkspace(workspace.id, 'user:pending_new', {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          requestedAt: updatedUser.requestedAt,
          joinCodeUsed: formattedCode,
        },
      });
      SocketService.emitToWorkspace(workspace.id, 'notification:new', { type: 'SYSTEM' });

      return res.json({
        message: `Đã gửi yêu cầu gia nhập vào "${workspace.name}". Vui lòng chờ Quản trị viên phê duyệt!`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          status: updatedUser.status,
          joinCodeUsed: updatedUser.joinCodeUsed,
          workspaceId: updatedUser.workspaceId,
          workspaceName: updatedUser.workspace.name,
          workspaceCode: updatedUser.workspace.code,
        },
      });
    } catch (error) {
      console.error('[Request Join Error]', error);
      return res.status(500).json({ message: 'Lỗi gửi yêu cầu gia nhập phòng' });
    }
  }

  // Lấy thông tin Workspace & Danh sách thành viên chính thức
  static async getWorkspaceDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const isAdmin = req.user!.role === 'ADMIN';

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          users: {
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
            orderBy: { role: 'asc' },
          },
          settings: isAdmin,
        },
      });

      if (!workspace) {
        return res.status(404).json({ message: 'Không tìm thấy Workspace' });
      }

      return res.json(workspace);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi tải thông tin workspace' });
    }
  }

  // Lấy danh sách thành viên workspace (dùng cho mời họp, giao task, v.v.)
  static async getMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const members = await prisma.user.findMany({
        where: { workspaceId, status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true, avatar: true },
        orderBy: { name: 'asc' },
      });
      return res.json(members);
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi tải danh sách thành viên' });
    }
  }

  // Cập nhật tên Workspace (Chỉ Admin)
  static async updateWorkspace(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { name } = req.body;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền cập nhật Workspace' });
      }

      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: { name: name?.trim() },
      });

      return res.json({ message: 'Cập nhật thông tin thành công', workspace: updated });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật workspace' });
    }
  }

  // Tạo lại mã mời ngẫu nhiên
  static async regenerateCode(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền đổi mã mời' });
      }

      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: { code: newCode },
      });

      return res.json({ message: 'Đã đổi mã phòng mới thành công', code: updated.code });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi đổi mã phòng' });
    }
  }

  // Thay đổi quyền hạn thành viên
  static async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const targetUserId = String(req.params.userId);
      const workspaceId = req.user!.workspaceId;
      const currentUserId = req.user!.userId;
      const { role } = req.body;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền thay đổi vai trò' });
      }

      if (!['ADMIN', 'SECRETARY', 'MANAGER', 'MEMBER'].includes(role)) {
        return res.status(400).json({ message: 'Vai trò không hợp lệ' });
      }

      if (targetUserId === currentUserId && role !== 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { workspaceId, role: 'ADMIN', status: 'ACTIVE' },
        });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Không thể tự hạ quyền vì bạn là Quản trị viên duy nhất trong tổ chức' });
        }
      }

      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, workspaceId },
      });

      if (!targetUser) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên' });
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });

      return res.json({ message: 'Đã cập nhật vai trò thành công', user: updated });
    } catch (error) {
      console.error('[Update Role Error]', error);
      return res.status(500).json({ message: 'Lỗi cập nhật vai trò thành viên' });
    }
  }

  // Xóa thành viên khỏi Workspace
  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const targetUserId = String(req.params.userId);
      const workspaceId = req.user!.workspaceId;
      const currentUserId = req.user!.userId;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền xóa thành viên' });
      }

      if (targetUserId === currentUserId) {
        return res.status(400).json({ message: 'Bạn không thể tự xóa chính mình khỏi nhóm' });
      }

      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, workspaceId },
      });

      if (!targetUser) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên' });
      }

      await prisma.user.delete({ where: { id: targetUserId } });
      return res.json({ message: 'Đã xóa thành viên khỏi Workspace thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa thành viên' });
    }
  }

  // Cập nhật cấu hình SMTP Email
  static async updateSmtpSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure } = req.body;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền chỉnh sửa cấu hình SMTP' });
      }

      const settings = await prisma.systemSetting.upsert({
        where: { workspaceId },
        update: {
          smtpHost: smtpHost || 'smtp.gmail.com',
          smtpPort: Number(smtpPort) || 587,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          smtpFrom: smtpFrom || 'Thông Báo Công Ty <no-reply@madbros.vn>',
          smtpSecure: Boolean(smtpSecure),
        },
        create: {
          workspaceId,
          smtpHost: smtpHost || 'smtp.gmail.com',
          smtpPort: Number(smtpPort) || 587,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          smtpFrom: smtpFrom || 'Thông Báo Công Ty <no-reply@madbros.vn>',
          smtpSecure: Boolean(smtpSecure),
        },
      });

      return res.json({ message: 'Đã lưu cấu hình email SMTP thành công', settings });
    } catch (error) {
      console.error('[Update SMTP Error]', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình email' });
    }
  }

  // Thử nghiệm gửi email test
  static async testEmail(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { testEmail } = req.body;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền thử nghiệm gửi email' });
      }

      const recipient = testEmail || req.user!.email;
      const result = await EmailService.testSmtp(workspaceId, recipient);

      if (!result.success) {
        return res.status(400).json({ message: `Gửi mail thất bại: ${result.error}` });
      }

      return res.json({ message: `Đã gửi email thử nghiệm thành công tới ${recipient}!` });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Lỗi kiểm tra email' });
    }
  }

  // Thử nghiệm gửi tin nhắn Telegram test
  static async testTelegram(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền thử nghiệm gửi Telegram' });
      }

      const { customMessage } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      const testMsg =
        `🚀 <b>[TEST KẾT NỐI BOT TELEGRAM] ⚡</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Kết nối giữa Hệ Thống Quản Lý MadBros và Bot Telegram đang hoạt động hoàn hảo!\n` +
        `👑 <b>Người gửi test:</b> ${user?.name || 'Quản trị viên'} (Admin)\n` +
        `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n` +
        (customMessage ? `📝 <b>Ghi chú:</b> <i>${customMessage}</i>\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎉 <i>Từ bây giờ, mọi hoạt động giao việc, họp và duyệt nhân sự sẽ được tự động cập nhật tại đây.</i>`;

      const success = await TelegramService.sendMessage(testMsg);

      if (!success) {
        return res.status(400).json({
          message: 'Gửi tin nhắn Telegram thất bại. Vui lòng kiểm tra lại TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong file .env!',
        });
      }

      return res.json({ message: 'Đã gửi tin nhắn thử nghiệm lên Telegram thành công!' });
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Lỗi khi test gửi tin nhắn Telegram' });
    }
  }
}
