import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';
import { SocketService } from '../services/socketService';
import { TelegramService } from '../services/telegramService';

export class AdminController {
  // ==========================================
  // 1. TỔNG QUAN DÀNH CHO BOSS (OVERVIEW)
  // ==========================================
  static async getOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;

      const [
        totalUsers,
        pendingApprovalsCount,
        totalTasks,
        pendingReviewTasks,
        totalMeetings,
        totalAssets,
        assetsSummary,
        financeIncome,
        financeExpense,
        recentUsers,
        workspace,
      ] = await Promise.all([
        prisma.user.count({ where: { workspaceId, status: 'ACTIVE' } }),
        prisma.user.count({ where: { workspaceId, status: 'PENDING_APPROVAL' } }),
        prisma.task.count({ where: { workspaceId } }),
        prisma.task.count({ where: { workspaceId, status: 'REVIEW' } }),
        prisma.meeting.count({ where: { workspaceId } }),
        prisma.asset.count({ where: { workspaceId } }),
        prisma.asset.aggregate({
          where: { workspaceId },
          _sum: { value: true },
        }),
        prisma.transaction.aggregate({
          where: { workspaceId, type: 'INCOME' },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { workspaceId, type: 'EXPENSE' },
          _sum: { amount: true },
        }),
        prisma.user.findMany({
          where: { workspaceId, status: 'ACTIVE' },
          select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true, name: true, code: true },
        }),
      ]);

      const income = financeIncome._sum.amount || 0;
      const expense = financeExpense._sum.amount || 0;
      const balance = income - expense;
      const totalAssetsValue = assetsSummary._sum.value || 0;

      return res.json({
        totalUsers,
        pendingApprovalsCount,
        totalTasks,
        pendingReviewTasks,
        totalMeetings,
        totalAssets,
        totalAssetsValue,
        income,
        expense,
        balance,
        recentUsers,
        workspaceCode: workspace?.code,
      });
    } catch (error) {
      console.error('[Admin Overview Error]', error);
      return res.status(500).json({ message: 'Lỗi tải tổng quan quản trị' });
    }
  }

  // ==========================================
  // 2. QUẢN LÝ MÃ PHÒNG (WORKSPACE CODE)
  // ==========================================
  static async updateWorkspaceCode(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { code } = req.body;

      if (!code || !String(code).trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập mã phòng hợp lệ' });
      }

      const formatted = String(code).trim().toUpperCase();

      const existing = await prisma.workspace.findFirst({
        where: { code: formatted, NOT: { id: workspaceId } },
      });
      if (existing) {
        return res.status(400).json({ message: 'Mã phòng này đã có doanh nghiệp khác sử dụng, vui lòng chọn mã khác' });
      }

      const updated = await prisma.workspace.update({
        where: { id: workspaceId },
        data: { code: formatted },
      });

      return res.json({ message: 'Cập nhật mã phòng công ty thành công!', code: updated.code });
    } catch (error) {
      console.error('[Update Code Error]', error);
      return res.status(500).json({ message: 'Lỗi cập nhật mã phòng' });
    }
  }

  // ==========================================
  // 3. DUYỆT TAY NHÂN VIÊN MỚI (APPROVALS)
  // ==========================================
  static async getPendingUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;

      const pendingUsers = await prisma.user.findMany({
        where: {
          workspaceId,
          status: 'PENDING_APPROVAL',
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          status: true,
          joinCodeUsed: true,
          requestedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(pendingUsers);
    } catch (error) {
      console.error('[Get Pending Error]', error);
      return res.status(500).json({ message: 'Lỗi tải danh sách chờ duyệt' });
    }
  }

  static async approvePendingUser(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;
      const { role } = req.body;

      const user = await prisma.user.findFirst({ where: { id, workspaceId } });
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu gia nhập' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          role: role || 'MEMBER',
        },
      });

      // Tạo thông báo chào mừng
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Đã được phê duyệt vào công ty! 🎉',
          content: 'Quản trị viên đã phê duyệt quyền truy cập phòng làm việc cho bạn. Bạn có thể bắt đầu làm việc ngay bây giờ.',
          type: 'SYSTEM',
        },
      });

      // 🤖 Tự động bắn thông báo Chào mừng thành viên mới lên Telegram
      const approver = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      TelegramService.notifyUserApproved({
        userName: user.name,
        userEmail: user.email,
        role: updated.role,
        approverName: approver?.name || 'Quản trị viên',
      }).catch((err) => console.error('[Telegram Approve Notify Error]', err));

      // ⚡ Real-Time WebSocket: Mở khóa ngay lập tức cho nhân viên được duyệt mà không cần F5
      SocketService.emitToUser(user.id, 'user:approved', {
        status: 'ACTIVE',
        role: updated.role,
        workspaceId,
      });
      SocketService.emitToWorkspace(workspaceId, 'workspace:member_approved', {
        userId: user.id,
        user: updated,
      });
      SocketService.emitToUser(user.id, 'notification:new', { type: 'SYSTEM' });

      return res.json({ message: `Đã phê duyệt thành viên "${user.name}" vào công ty!`, user: updated });
    } catch (error) {
      console.error('[Approve Error]', error);
      return res.status(500).json({ message: 'Lỗi phê duyệt thành viên' });
    }
  }

  static async rejectPendingUser(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;

      const user = await prisma.user.findFirst({ where: { id, workspaceId } });
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
      }

      await prisma.user.delete({ where: { id } });

      // ⚡ Real-Time WebSocket
      SocketService.emitToUser(user.id, 'user:rejected', {});
      SocketService.emitToWorkspace(workspaceId, 'workspace:member_rejected', { userId: user.id });

      return res.json({ message: `Đã từ chối yêu cầu của "${user.name}"` });
    } catch (error) {
      console.error('[Reject Error]', error);
      return res.status(500).json({ message: 'Lỗi từ chối thành viên' });
    }
  }

  // ==========================================
  // 4. QUẢN LÝ NHÂN SỰ CHÍNH THỨC / USERS (CRUD)
  // ==========================================
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { search, role } = req.query;

      const whereClause: any = { workspaceId, status: 'ACTIVE' };
      if (role && role !== 'ALL') {
        whereClause.role = String(role);
      }
      if (search) {
        whereClause.OR = [
          { name: { contains: String(search) } },
          { email: { contains: String(search) } },
        ];
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          assignedTasks: { select: { taskId: true, status: true } },
          assignedAssets: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = users.map((u) => ({
        ...u,
        totalTasks: u.assignedTasks.length,
        totalAssets: u.assignedAssets.length,
      }));

      return res.json(formatted);
    } catch (error) {
      console.error('[Admin Get Users Error]', error);
      return res.status(500).json({ message: 'Lỗi tải danh sách nhân sự' });
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Vui lòng điền đủ họ tên, email và mật khẩu' });
      }

      const existing = await prisma.user.findUnique({
        where: { email: String(email).trim().toLowerCase() },
      });
      if (existing) {
        return res.status(400).json({ message: 'Email này đã tồn tại trên hệ thống' });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);
      const user = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          password: hashedPassword,
          role: role || 'MEMBER',
          status: 'ACTIVE',
          workspaceId,
        },
      });

      return res.status(201).json({
        message: 'Thêm nhân viên mới thành công',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error) {
      console.error('[Admin Create User Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tạo nhân viên' });
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const { name, role } = req.body;
      const workspaceId = req.user!.workspaceId;

      const user = await prisma.user.findFirst({ where: { id, workspaceId } });
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          name: name ? String(name).trim() : user.name,
          role: role || user.role,
        },
      });

      return res.json({ message: 'Cập nhật thông tin nhân viên thành công', user: updated });
    } catch (error) {
      console.error('[Admin Update User Error]', error);
      return res.status(500).json({ message: 'Lỗi cập nhật nhân viên' });
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const { newPassword } = req.body;
      const workspaceId = req.user!.workspaceId;

      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      }

      const user = await prisma.user.findFirst({ where: { id, workspaceId } });
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      const hashedPassword = await bcrypt.hash(String(newPassword), 10);
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      return res.json({ message: `Đã đặt lại mật khẩu cho "${user.name}" thành công!` });
    } catch (error) {
      console.error('[Admin Reset Pass Error]', error);
      return res.status(500).json({ message: 'Lỗi đặt lại mật khẩu' });
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const currentUserId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;

      if (id === currentUserId) {
        return res.status(400).json({ message: 'Không thể tự xóa chính tài khoản của bạn' });
      }

      const user = await prisma.user.findFirst({ where: { id, workspaceId } });
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      await prisma.user.delete({ where: { id } });
      return res.json({ message: `Đã xóa nhân viên "${user.name}" khỏi hệ thống` });
    } catch (error) {
      console.error('[Admin Delete User Error]', error);
      return res.status(500).json({ message: 'Lỗi xóa người dùng' });
    }
  }

  // ==========================================
  // 5. QUẢN LÝ TÀI SẢN & THIẾT BỊ / ASSETS (CRUD)
  // ==========================================
  static async getAssets(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { search, category, status } = req.query;

      const whereClause: any = { workspaceId };
      if (category && category !== 'ALL') whereClause.category = String(category);
      if (status && status !== 'ALL') whereClause.status = String(status);
      if (search) {
        whereClause.OR = [
          { name: { contains: String(search) } },
          { code: { contains: String(search) } },
          { location: { contains: String(search) } },
        ];
      }

      const assets = await prisma.asset.findMany({
        where: whereClause,
        include: {
          assignedTo: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(assets);
    } catch (error) {
      console.error('[Admin Get Assets Error]', error);
      return res.status(500).json({ message: 'Lỗi tải danh sách tài sản' });
    }
  }

  static async createAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { code, name, category, value, location, note, assignedToId, status } = req.body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'Vui lòng nhập tên tài sản' });
      }

      const assetCode = code ? String(code).trim() : `TS-${Math.floor(1000 + Math.random() * 9000)}`;

      const asset = await prisma.asset.create({
        data: {
          code: assetCode,
          name: String(name).trim(),
          category: category || 'Thiết bị IT',
          value: Number(value) || 0,
          location: location ? String(location).trim() : null,
          note: note ? String(note).trim() : null,
          status: status || (assignedToId ? 'IN_USE' : 'AVAILABLE'),
          assignedToId: assignedToId ? String(assignedToId) : null,
          assignedDate: assignedToId ? new Date() : null,
          workspaceId,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(201).json({ message: 'Thêm tài sản mới thành công', asset });
    } catch (error) {
      console.error('[Admin Create Asset Error]', error);
      return res.status(500).json({ message: 'Lỗi thêm tài sản' });
    }
  }

  static async updateAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;
      const { code, name, category, value, location, note, assignedToId, status } = req.body;

      const existing = await prisma.asset.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        return res.status(404).json({ message: 'Không tìm thấy tài sản' });
      }

      const updated = await prisma.asset.update({
        where: { id },
        data: {
          code: code ? String(code).trim() : existing.code,
          name: name ? String(name).trim() : existing.name,
          category: category || existing.category,
          value: value !== undefined ? Number(value) : existing.value,
          location: location !== undefined ? (location ? String(location).trim() : null) : existing.location,
          note: note !== undefined ? (note ? String(note).trim() : null) : existing.note,
          status: status || existing.status,
          assignedToId: assignedToId !== undefined ? (assignedToId ? String(assignedToId) : null) : existing.assignedToId,
          assignedDate: assignedToId && String(assignedToId) !== existing.assignedToId ? new Date() : existing.assignedDate,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json({ message: 'Cập nhật tài sản thành công', asset: updated });
    } catch (error) {
      console.error('[Admin Update Asset Error]', error);
      return res.status(500).json({ message: 'Lỗi cập nhật tài sản' });
    }
  }

  static async deleteAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;

      const asset = await prisma.asset.findFirst({ where: { id, workspaceId } });
      if (!asset) {
        return res.status(404).json({ message: 'Không tìm thấy tài sản' });
      }

      await prisma.asset.delete({ where: { id } });
      return res.json({ message: `Đã xóa tài sản "${asset.name}"` });
    } catch (error) {
      console.error('[Admin Delete Asset Error]', error);
      return res.status(500).json({ message: 'Lỗi xóa tài sản' });
    }
  }
}
