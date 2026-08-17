import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';

export class WorkspaceController {
  // Lấy thông tin Workspace & Danh sách thành viên
  static async getWorkspaceDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const isAdmin = req.user!.role === 'ADMIN';

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          users: {
            select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
            orderBy: { role: 'asc' },
          },
          settings: isAdmin, // Chỉ Admin mới thấy settings bảo mật
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

  // Tạo lại mã mời (Regenerate Invite Code - Chỉ Admin)
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

      return res.json({ message: 'Đã đổi mã mời mới thành công', code: updated.code });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi đổi mã mời' });
    }
  }

  // Thay đổi quyền hạn thành viên (Phân quyền: ADMIN hoặc MEMBER)
  static async updateMemberRole(req: AuthenticatedRequest, res: Response) {
    try {
      const targetUserId = String(req.params.userId);
      const workspaceId = req.user!.workspaceId;
      const currentUserId = req.user!.userId;
      const { role } = req.body;

      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Chỉ Quản trị viên mới có quyền thay đổi vai trò' });
      }

      if (!['ADMIN', 'MEMBER'].includes(role)) {
        return res.status(400).json({ message: 'Vai trò không hợp lệ (Phải là ADMIN hoặc MEMBER)' });
      }

      // Tránh tự hạ quyền chính mình nếu là Admin duy nhất
      if (targetUserId === currentUserId && role !== 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { workspaceId, role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Không thể tự hạ quyền vì bạn là Quản trị viên duy nhất trong tổ chức' });
        }
      }

      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, workspaceId },
      });

      if (!targetUser) {
        return res.status(404).json({ message: 'Không tìm thấy thành viên trong Workspace này' });
      }

      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { role },
        select: { id: true, name: true, email: true, role: true },
      });

      // Tạo thông báo cho thành viên được phân quyền
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Thay đổi quyền hạn tài khoản',
          content: `Vai trò của bạn đã được cập nhật thành: ${role === 'ADMIN' ? 'Quản Trị Viên (ADMIN)' : 'Thành Viên (MEMBER)'}`,
          type: 'SYSTEM',
        },
      });

      return res.json({ message: 'Đã cập nhật vai trò thành công', user: updated });
    } catch (error) {
      console.error('[Update Role Error]', error);
      return res.status(500).json({ message: 'Lỗi cập nhật vai trò thành viên' });
    }
  }

  // Xóa thành viên khỏi Workspace (Chỉ Admin)
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

  // Cập nhật cấu hình SMTP Email (Chỉ Admin)
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

  // Thử nghiệm gửi email test (Chỉ Admin)
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
}
