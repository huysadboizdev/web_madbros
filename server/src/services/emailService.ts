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

  // 1. Gửi Email thông báo lịch họp
  public static async sendMeetingInvite(
    workspaceId: string,
    recipients: string[],
    data: MeetingEmailData
  ) {
    if (!recipients || recipients.length === 0) return { success: true, count: 0 };

    try {
      const { transporter, from } = await this.getTransporter(workspaceId);

      const formattedStart = new Date(data.startTime).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        dateStyle: 'full',
        timeStyle: 'short',
      });
      const formattedEnd = new Date(data.endTime).toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        timeStyle: 'short',
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; text-align: center; }
            .content { padding: 24px; }
            .box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; margin-top: 12px; }
            .footer { padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">📅 THÔNG BÁO LỊCH HỌP MỚI</h1>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${data.workspaceName}</p>
            </div>
            <div class="content">
              <p>Xin chào,</p>
              <p>Bạn nhận được lời mời tham gia cuộc họp từ <strong>${data.creatorName}</strong>:</p>
              <div class="box">
                <h3 style="margin-top: 0; color: #1e293b;">${data.title}</h3>
                <p>⏰ <strong>Thời gian:</strong> ${formattedStart} - ${formattedEnd}</p>
                ${data.location ? `<p>📍 <strong>Địa điểm:</strong> ${data.location}</p>` : ''}
                ${data.meetingLink ? `<p>🔗 <strong>Link phòng họp:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>` : ''}
                ${data.description ? `<p>📝 <strong>Nội dung:</strong> ${data.description}</p>` : ''}
              </div>
              ${data.meetingLink ? `<div style="text-align: center;"><a href="${data.meetingLink}" class="btn">Tham Gia Cuộc Họp</a></div>` : ''}
            </div>
            <div class="footer">Email tự động từ hệ thống quản trị ${data.workspaceName}.</div>
          </div>
        </body>
        </html>
      `;

      if (!transporter) {
        console.log(`[Email Mocked] Đã gửi thông báo họp "${data.title}" đến: ${recipients.join(', ')}`);
        return { success: true, count: recipients.length, mocked: true };
      }

      const info = await transporter.sendMail({
        from,
        to: recipients.join(', '),
        subject: `[Lịch Họp] ${data.title} - ${data.workspaceName}`,
        html: htmlContent,
      });

      return { success: true, messageId: info.messageId, count: recipients.length };
    } catch (error) {
      console.error('[EmailService] Lỗi khi gửi email họp:', error);
      return { success: false, error: String(error) };
    }
  }

  // 2. Gửi Email thông báo phân công Task mới (Kèm nút tiếp nhận)
  public static async sendTaskAssignment(
    workspaceId: string,
    recipients: string[],
    data: TaskEmailData
  ) {
    if (!recipients || recipients.length === 0) return { success: true, count: 0 };

    try {
      const { transporter, from } = await this.getTransporter(workspaceId);

      const formattedDue = data.dueDate
        ? new Date(data.dueDate).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Không có hạn chót';

      const priorityText =
        data.priority === 'URGENT'
          ? '🚨 KHẨN CẤP'
          : data.priority === 'HIGH'
          ? '🔥 CAO'
          : data.priority === 'MEDIUM'
          ? '⚡ TRUNG BÌNH'
          : '🌱 THẤP';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 24px; text-align: center; }
            .content { padding: 24px; }
            .task-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #e0e7ff; color: #4338ca; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; margin-top: 16px; }
            .subtask-item { padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; }
            .footer { padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px;">📌 BẠN ĐƯỢC GIAO CÔNG VIỆC MỚI</h1>
              <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${data.workspaceName}</p>
            </div>
            <div class="content">
              <p>Xin chào,</p>
              <p><strong>${data.creatorName}</strong> vừa giao cho bạn một công việc mới trên hệ thống.</p>
              
              <div class="task-box">
                <div style="margin-bottom: 8px;">
                  <span class="badge">${priorityText}</span>
                </div>
                <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px;">${data.title}</h2>
                <p style="margin: 4px 0; font-size: 13px; color: #64748b;">⏳ <strong>Hạn chót:</strong> ${formattedDue}</p>
                ${data.description ? `<p style="margin: 8px 0; font-size: 13px; color: #334155; white-space: pre-wrap;"><strong>Mô tả yêu cầu:</strong><br>${data.description}</p>` : ''}

                ${data.subtasks && data.subtasks.length > 0 ? `
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                    <strong style="font-size: 13px; color: #1e293b;">Checklist việc con (${data.subtasks.length} mục):</strong>
                    <div style="margin-top: 6px;">
                      ${data.subtasks.map((st, i) => `<div class="subtask-item">▫️ ${st.title}</div>`).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <div style="text-align: center;">
                <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Vui lòng đăng nhập vào Web để bấm <strong>"Tiếp Nhận Task"</strong> và bắt đầu làm việc:</p>
                <a href="http://localhost" class="btn">Xem & Tiếp Nhận Task Ngay</a>
              </div>
            </div>
            <div class="footer">Email tự động từ hệ thống quản trị ${data.workspaceName}.</div>
          </div>
        </body>
        </html>
      `;

      if (!transporter) {
        console.log(`[Email Mocked] Đã gửi thông báo giao task "${data.title}" đến: ${recipients.join(', ')}`);
        return { success: true, count: recipients.length, mocked: true };
      }

      const info = await transporter.sendMail({
        from,
        to: recipients.join(', '),
        subject: `[Giao Việc] ${data.title} - ${data.workspaceName}`,
        html: htmlContent,
      });

      return { success: true, messageId: info.messageId, count: recipients.length };
    } catch (error) {
      console.error('[EmailService] Lỗi khi gửi email giao task:', error);
      return { success: false, error: String(error) };
    }
  }

  // 3. Gửi Email thông báo trạng thái Task (Đã nhận / Gửi duyệt / Đã duyệt)
  public static async sendTaskStatusUpdate(
    workspaceId: string,
    recipientEmail: string,
    infoData: {
      subject: string;
      title: string;
      message: string;
      taskTitle: string;
      workspaceName: string;
    }
  ) {
    if (!recipientEmail) return { success: true };

    try {
      const { transporter, from } = await this.getTransporter(workspaceId);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 16px; }
            .task-title { background: #f1f5f9; padding: 12px; border-radius: 8px; font-weight: bold; margin: 12px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2 style="margin: 0; color: #1e293b;">${infoData.title}</h2>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">${infoData.workspaceName}</p>
            </div>
            <p>${infoData.message}</p>
            <div class="task-title">📌 Công việc: ${infoData.taskTitle}</div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              Email được gửi tự động từ hệ thống quản trị ${infoData.workspaceName}.
            </p>
          </div>
        </body>
        </html>
      `;

      if (!transporter) {
        console.log(`[Email Mocked] Cập nhật task "${infoData.taskTitle}" gửi tới: ${recipientEmail} - ${infoData.title}`);
        return { success: true, mocked: true };
      }

      await transporter.sendMail({
        from,
        to: recipientEmail,
        subject: `${infoData.subject} - ${infoData.workspaceName}`,
        html: htmlContent,
      });

      return { success: true };
    } catch (error) {
      console.error('[EmailService] Lỗi khi gửi email cập nhật trạng thái:', error);
      return { success: false, error: String(error) };
    }
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
