import nodemailer from 'nodemailer';
import { prisma } from '../config/db';

interface MeetingEmailData {
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  meetingLink?: string | null;
  location?: string | null;
  creatorName: string;
  workspaceName: string;
}

interface TaskEmailData {
  title: string;
  description?: string | null;
  priority: string;
  dueDate?: Date | null;
  subtasks?: { title: string }[];
  creatorName: string;
  workspaceName: string;
}

export class EmailService {
  private static async getTransporter(workspaceId: string) {
    const setting = await prisma.systemSetting.findUnique({
      where: { workspaceId },
    });

    const host = setting?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = setting?.smtpPort || Number(process.env.SMTP_PORT) || 587;
    const user = setting?.smtpUser || process.env.SMTP_USER;
    const pass = setting?.smtpPass || process.env.SMTP_PASS;
    const secure = setting?.smtpSecure || false;
    const from = setting?.smtpFrom || process.env.SMTP_FROM || `"MadBros Portal" <${user || 'no-reply@madbros.vn'}>`;

    if (!user || !pass) {
      console.warn('[EmailService] SMTP chưa được cấu hình (Chưa có User/Pass). Email sẽ được mô phỏng log ra console.');
      return { transporter: null, from };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    return { transporter, from };
  }

  // 1. Gửi Email thông báo lịch họp (Đã tắt theo yêu cầu vì đã có Telegram)
  public static async sendMeetingInvite(
    _workspaceId: string,
    _recipients: string[],
    _data: MeetingEmailData
  ) {
    return { success: true, count: 0, disabled: true };
  }

  // 2. Gửi Email thông báo phân công Task mới (Đã tắt theo yêu cầu vì đã có Telegram)
  public static async sendTaskAssignment(
    _workspaceId: string,
    _recipients: string[],
    _data: TaskEmailData
  ) {
    return { success: true, count: 0, disabled: true };
  }

  // 3. Gửi Email thông báo trạng thái Task (Đã tắt theo yêu cầu vì đã có Telegram)
  public static async sendTaskStatusUpdate(
    _workspaceId: string,
    _recipientEmail: string,
    _infoData: {
      subject: string;
      title: string;
      message: string;
      taskTitle: string;
      workspaceName: string;
    }
  ) {
    return { success: true, disabled: true };
  }

  // 4. Test SMTP
  public static async testSmtp(workspaceId: string, targetEmail: string) {
    try {
      const { transporter, from } = await this.getTransporter(workspaceId);
      if (!transporter) {
        throw new Error('Chưa cấu hình tài khoản/mật khẩu SMTP');
      }

      await transporter.verify();
      const info = await transporter.sendMail({
        from,
        to: targetEmail,
        subject: 'Kiểm tra cấu hình gửi mail MadBros',
        html: `<p>Xin chào! Cấu hình gửi mail SMTP của bạn đã hoạt động chính xác.</p>`,
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      return { success: false, error: error.message || String(error) };
    }
  }
}
