import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { generateToken } from '../config/jwt';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AuthController {
  // Đăng ký tạo Workspace mới (dành cho Chủ doanh nghiệp/Admin)
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, workspaceName } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ email, mật khẩu và họ tên' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email này đã được sử dụng' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create Workspace & Admin User in transaction
      const result = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName || 'Doanh Nghiệp Của Tôi',
            code: inviteCode,
            settings: {
              create: {},
            },
          },
        });

        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: 'ADMIN',
            workspaceId: workspace.id,
          },
        });

        return { user, workspace };
      });

      const token = generateToken({
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        workspaceId: result.workspace.id,
      });

      return res.status(201).json({
        message: 'Đăng ký thành công',
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          workspaceId: result.workspace.id,
          workspaceName: result.workspace.name,
          workspaceCode: result.workspace.code,
        },
      });
    } catch (error) {
      console.error('[Register Error]', error);
      return res.status(500).json({ message: 'Đã có lỗi xảy ra khi đăng ký' });
    }
  }

  // Đăng ký tham gia Workspace bằng mã mời (dành cho Nhân viên)
  static async joinWithCode(req: Request, res: Response) {
    try {
      const { email, password, name, inviteCode } = req.body;

      if (!email || !password || !name || !inviteCode) {
        return res.status(400).json({ message: 'Vui lòng cung cấp mã mời (Invite Code) và thông tin cá nhân' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email này đã tồn tại trong hệ thống' });
      }

      const workspace = await prisma.workspace.findUnique({
        where: { code: inviteCode.trim().toUpperCase() },
      });

      if (!workspace) {
        return res.status(404).json({ message: 'Mã mời Workspace không hợp lệ hoặc không tồn tại' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'MEMBER',
          workspaceId: workspace.id,
        },
      });

      // Tạo thông báo chào mừng
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Chào mừng gia nhập!',
          content: `Bạn đã tham gia thành công vào workspace "${workspace.name}".`,
          type: 'SYSTEM',
        },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        workspaceId: workspace.id,
      });

      return res.status(201).json({
        message: 'Tham gia nhóm thành công',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceCode: workspace.code,
        },
      });
    } catch (error) {
      console.error('[Join Error]', error);
      return res.status(500).json({ message: 'Đã có lỗi xảy ra khi tham gia workspace' });
    }
  }

  // Đăng nhập
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { workspace: true },
      });

      if (!user) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
      });

      return res.json({
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace.name,
          workspaceCode: user.workspace.code,
        },
      });
    } catch (error) {
      console.error('[Login Error]', error);
      return res.status(500).json({ message: 'Đã có lỗi xảy ra khi đăng nhập' });
    }
  }

  // Lấy thông tin cá nhân hiện tại
  static async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Không có quyền truy cập' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { workspace: true },
      });

      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng' });
      }

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        workspaceId: user.workspaceId,
        workspaceName: user.workspace.name,
        workspaceCode: user.workspace.code,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi lấy thông tin cá nhân' });
    }
  }
}
