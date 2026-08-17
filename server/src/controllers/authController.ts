import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { generateToken } from '../config/jwt';
import { AuthenticatedRequest } from '../middlewares/auth';

export class AuthController {
  // Đăng nhập duy nhất
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
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
          status: user.status || 'ACTIVE',
          joinCodeUsed: user.joinCodeUsed,
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

  // Đăng nhập nhanh bằng Google
  static async googleLogin(req: Request, res: Response) {
    try {
      const { credential, email: rawEmail, name: rawName, avatar: rawAvatar } = req.body;

      let email = rawEmail?.trim()?.toLowerCase();
      let name = rawName?.trim();
      let avatar = rawAvatar;

      if (credential) {
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
          if (response.ok) {
            const googlePayload: any = await response.json();
            email = googlePayload.email?.toLowerCase();
            name = googlePayload.name || name;
            avatar = googlePayload.picture || avatar;
          } else {
            const parts = credential.split('.');
            if (parts.length === 3) {
              const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              if (decoded.email) {
                email = decoded.email.toLowerCase();
                name = decoded.name || name;
                avatar = decoded.picture || avatar;
              }
            }
          }
        } catch (e) {
          console.warn('[Google Auth] Token verification fallback:', e);
        }
      }

      if (!email) {
        return res.status(400).json({ message: 'Không thể xác thực thông tin tài khoản Google' });
      }

      name = name || email.split('@')[0];

      // 1. Kiểm tra xem User đã có trong DB chưa
      let user = await prisma.user.findUnique({
        where: { email },
        include: { workspace: true },
      });

      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@madbros.vn').toLowerCase();
      const isAdminEmail = email === adminEmail;

      if (user) {
        if (avatar && !user.avatar) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { avatar },
            include: { workspace: true },
          });
        }
      } else {
        // Tạo Workspace mặc định nếu chưa có
        let workspace = await prisma.workspace.findFirst();
        if (!workspace) {
          workspace = await prisma.workspace.create({
            data: {
              name: 'MadBros Enterprise',
              code: 'MADBROS',
              settings: { create: {} },
            },
          });
        }

        const randomPassword = await bcrypt.hash(Math.random().toString(36) + 'google_secret_2026', 10);

        user = await prisma.user.create({
          data: {
            email,
            password: randomPassword,
            name,
            role: isAdminEmail ? 'ADMIN' : 'MEMBER',
            status: isAdminEmail ? 'ACTIVE' : 'PENDING_APPROVAL',
            avatar,
            workspaceId: workspace.id,
          },
          include: { workspace: true },
        });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
      });

      return res.json({
        message: 'Đăng nhập Google thành công',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status || 'ACTIVE',
          joinCodeUsed: user.joinCodeUsed,
          avatar: user.avatar,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace.name,
          workspaceCode: user.workspace.code,
        },
      });
    } catch (error) {
      console.error('[Google Auth Error]', error);
      return res.status(500).json({ message: 'Đã có lỗi xảy ra khi xác thực Google' });
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
        status: user.status || 'ACTIVE',
        joinCodeUsed: user.joinCodeUsed,
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
