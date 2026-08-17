import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';

export async function bootstrapAdminAccount() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    const adminName = process.env.ADMIN_NAME?.trim() || 'Quản Trị Viên';
    const workspaceName = process.env.WORKSPACE_NAME?.trim() || 'Doanh Nghiệp MadBros';
    const workspaceCode = (process.env.WORKSPACE_CODE?.trim() || 'MADBROS').toUpperCase();

    if (!adminEmail || !adminPassword) {
      console.log('[Bootstrap] Không tìm thấy cấu hình ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env. Bỏ qua tự động tạo admin.');
      return;
    }

    // 1. Tìm hoặc tạo Workspace
    let workspace = await prisma.workspace.findFirst({
      where: {
        OR: [
          { code: workspaceCode },
          { name: workspaceName },
        ],
      },
      include: { settings: true },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: workspaceName,
          code: workspaceCode,
          settings: {
            create: {
              smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
              smtpPort: Number(process.env.SMTP_PORT) || 587,
              smtpUser: process.env.SMTP_USER || null,
              smtpPass: process.env.SMTP_PASS || null,
              smtpFrom: process.env.SMTP_FROM || 'Thông Báo Công Ty <no-reply@madbros.vn>',
            },
          },
        },
        include: { settings: true },
      });
      console.log(`[Bootstrap] Đã tự động tạo Workspace: "${workspace.name}" (Mã mời: ${workspace.code})`);
    }

    // 2. Tìm hoặc tạo/cập nhật tài khoản Admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (!existingAdmin) {
      const newAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          workspaceId: workspace.id,
        },
      });
      console.log(`[Bootstrap] ✅ Đã tự động đăng ký tài khoản Admin từ .env: ${newAdmin.email} | Vai trò: ADMIN`);
    } else {
      // Cập nhật mật khẩu và đảm bảo quyền ADMIN
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          workspaceId: workspace.id,
          name: existingAdmin.name || adminName,
        },
      });
      console.log(`[Bootstrap] 🔄 Đã đồng bộ tài khoản Admin từ .env: ${existingAdmin.email} (Quyền: ADMIN)`);
    }
  } catch (error) {
    console.error('[Bootstrap Error] Lỗi khi tự động khởi tạo Admin từ .env:', error);
  }
}
