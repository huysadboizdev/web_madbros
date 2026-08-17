/**
 * Telegram Notification Service
 * Tự động gửi thông báo ngắn gọn, xúc tích, dễ theo dõi từ Web lên Nhóm/Kênh Telegram
 */

export class TelegramService {
  private static getCredentials() {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const rawChatId = process.env.TELEGRAM_CHAT_ID || process.env.MAIN_GROUP_ID || '';
    const rawChannelId = process.env.TELEGRAM_CHANNEL_ID || '';
    const isEnabled = process.env.TELEGRAM_ENABLED !== 'false';

    const chatIds = Array.from(
      new Set(
        `${rawChatId},${rawChannelId}`
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      )
    );

    return { token, chatIds, isEnabled };
  }

  /**
   * Helper format ngày giờ ngắn gọn (HH:mm DD/MM/YYYY)
   */
  private static formatDateTime(date?: Date | string | null): string {
    if (!date) return 'Không thời hạn';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(date);
    }
  }

  /**
   * Escape HTML entities to prevent Telegram parse errors
   */
  public static escapeHtml(text?: string | null): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Chuẩn hóa chuỗi tag Telegram (@username)
   */
  public static formatTelegramTag(tag?: string | null): string {
    if (!tag || !tag.trim()) return '';
    return tag
      .trim()
      .split(/[\s,]+/)
      .map((t) => {
        const clean = t.replace(/^@+/, '').trim();
        return clean ? `@${clean}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Gửi tin nhắn HTML tới tất cả các Nhóm & Kênh Telegram đã cấu hình
   */
  public static async sendMessage(htmlMessage: string): Promise<boolean> {
    const { token, chatIds, isEnabled } = this.getCredentials();

    if (!isEnabled) {
      return false;
    }

    if (!token || chatIds.length === 0) {
      console.log('\n[Telegram Broadcast]');
      console.log(htmlMessage.replace(/<[^>]*>?/gm, ''));
      console.log('--------------------\n');
      return true;
    }

    let allSuccess = true;

    await Promise.allSettled(
      chatIds.map(async (chatId) => {
        try {
          const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: htmlMessage,
              parse_mode: 'HTML',
              disable_web_page_preview: false,
            }),
          });

          const data = (await response.json()) as any;
          if (!data.ok) {
            console.error(`[Telegram Error Chat ${chatId}]`, data.description || 'Lỗi gửi tin');
            allSuccess = false;
          }
        } catch (err: any) {
          console.error(`[Telegram Network Error Chat ${chatId}]`, err.message);
          allSuccess = false;
        }
      })
    );

    return allSuccess;
  }

  // =========================================================================
  // 1. CÁC THÔNG BÁO TỪ HỆ THỐNG / ADMIN
  // =========================================================================

  /**
   * 1.1 Giao việc mới (Tạo Task)
   */
  public static async notifyTaskCreated(data: {
    title: string;
    description?: string | null;
    priority: string;
    dueDate?: Date | string | null;
    creatorName: string;
    assignees: string[];
    subtasks?: string[];
    telegramTag?: string | null;
  }) {
    const assigneeList = data.assignees.length > 0 ? data.assignees.join(', ') : 'Chưa phân công';
    const tagFormatted = this.formatTelegramTag(data.telegramTag);
    const tagHeader = tagFormatted ? `${tagFormatted}\n` : '';

    const safeTitle = this.escapeHtml(data.title);
    const safeCreator = this.escapeHtml(data.creatorName);
    const safeAssignee = this.escapeHtml(assigneeList);
    const safeDesc = this.escapeHtml(data.description);

    const subtaskText =
      data.subtasks && data.subtasks.length > 0
        ? `Checklist (${data.subtasks.length}):\n` +
          data.subtasks.map((s, idx) => `  ${idx + 1}. ${this.escapeHtml(s)}`).join('\n') +
          '\n'
        : '';

    const msg =
      `${tagHeader}<b>GIAO VIỆC MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Task: <b>${safeTitle}</b>\n` +
      `By: ${safeCreator}\n` +
      `Phụ trách: ${safeAssignee}\n` +
      `Tiến độ: Chưa làm\n` +
      `Hạn: ${this.formatDateTime(data.dueDate)}\n` +
      (safeDesc ? `Mô tả: ${safeDesc}\n` : '') +
      subtaskText;

    return this.sendMessage(msg.trim());
  }

  /**
   * 1.2 Lên lịch họp mới (Tạo Meeting)
   */
  public static async notifyMeetingCreated(data: {
    title: string;
    description?: string | null;
    startTime: Date | string;
    endTime: Date | string;
    meetingLink?: string | null;
    location?: string | null;
    creatorName: string;
    participantCount?: number;
  }) {
    const safeTitle = this.escapeHtml(data.title);
    const safeCreator = this.escapeHtml(data.creatorName);
    const linkText = data.meetingLink
      ? `Link: <a href="${data.meetingLink}">${data.meetingLink}</a>\n`
      : '';
    const locText = data.location ? `Địa điểm: ${this.escapeHtml(data.location)}\n` : '';
    const descText = data.description ? `Nội dung: ${this.escapeHtml(data.description)}\n` : '';

    const msg =
      `<b>LỊCH HỌP MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Meeting: <b>${safeTitle}</b>\n` +
      `By: ${safeCreator}\n` +
      `Bắt đầu: ${this.formatDateTime(data.startTime)}\n` +
      `Kết thúc: ${this.formatDateTime(data.endTime)}\n` +
      linkText +
      locText +
      descText;

    return this.sendMessage(msg.trim());
  }

  /**
   * 1.3 Phát Thông Báo Chung Toàn Công Ty (Announcement Broadcast)
   */
  public static async notifyAnnouncementBroadcast(data: {
    title: string;
    content: string;
    priority?: string;
    senderName: string;
    roleTitle?: string;
    telegramTag?: string | null;
  }) {
    const tagFormatted = this.formatTelegramTag(data.telegramTag);
    const tagHeader = tagFormatted ? `${tagFormatted}\n` : '';

    const safeTitle = this.escapeHtml(data.title);
    const safeContent = this.escapeHtml(data.content);
    const safeSender = this.escapeHtml(data.senderName);
    const safeRole = this.escapeHtml(data.roleTitle || 'Boss');

    const msg =
      `${tagHeader}📌 <b>${safeTitle}</b>\n` +
      `By: ${safeSender} - ${safeRole}\n` +
      `Time: ${this.formatDateTime(new Date())}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 ${safeContent}`;

    return this.sendMessage(msg.trim());
  }

  /**
   * 1.4 Chào mừng thành viên mới
   */
  public static async notifyUserApproved(data: {
    userName: string;
    userEmail: string;
    role: string;
    approverName?: string;
  }) {
    const roleText =
      data.role === 'ADMIN'
        ? 'Quản trị viên'
        : data.role === 'SECRETARY'
        ? 'Thư ký'
        : data.role === 'MANAGER'
        ? 'Quản lý'
        : 'Thành viên';

    const safeName = this.escapeHtml(data.userName);
    const safeEmail = this.escapeHtml(data.userEmail);

    const msg =
      `<b>CHÀO MỪNG THÀNH VIÊN MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thành viên mới: ${safeName} - ${safeEmail} - ${roleText}`;

    return this.sendMessage(msg.trim());
  }

  /**
   * 1.5 Sếp duyệt nghiệm thu hoặc Yêu cầu làm lại task
   */
  public static async notifyTaskReviewed(data: {
    title: string;
    reviewerName: string;
    assigneeNames: string[];
    action: 'APPROVE' | 'REJECT';
    feedback?: string | null;
  }) {
    const assigneeStr = data.assigneeNames.join(', ') || 'Nhân viên';
    const safeTitle = this.escapeHtml(data.title);
    const safeAssignee = this.escapeHtml(assigneeStr);
    const safeReviewer = this.escapeHtml(data.reviewerName);
    const safeFeedback = this.escapeHtml(data.feedback);

    if (data.action === 'APPROVE') {
      const msg =
        `<b>NGHIỆM THU THÀNH CÔNG</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Task: <b>${safeTitle}</b>\n` +
        `By: ${safeAssignee}\n` +
        `Duyệt bởi: ${safeReviewer}\n` +
        (safeFeedback ? `Đánh giá: ${safeFeedback}\n` : '') +
        `Tiến độ: Hoàn thành`;
      return this.sendMessage(msg.trim());
    } else {
      const msg =
        `<b>YÊU CẦU LÀM LẠI CÔNG VIỆC</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Task: <b>${safeTitle}</b>\n` +
        `By: ${safeAssignee}\n` +
        `Yêu cầu bởi: ${safeReviewer}\n` +
        (safeFeedback ? `Lý do: ${safeFeedback}\n` : '') +
        `Tiến độ: Đang làm`;
      return this.sendMessage(msg.trim());
    }
  }

  /**
   * 1.6 Hủy cuộc họp
   */
  public static async notifyMeetingDeleted(data: {
    title: string;
    cancellerName: string;
  }) {
    const safeTitle = this.escapeHtml(data.title);
    const safeCanceller = this.escapeHtml(data.cancellerName);

    const msg =
      `<b>HỦY LỊCH HỌP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Meeting: <b>${safeTitle}</b>\n` +
      `Hủy bởi: ${safeCanceller}`;

    return this.sendMessage(msg.trim());
  }

  // =========================================================================
  // 2. CÁC THÔNG BÁO TỪ PHÍA NHÂN VIÊN (MEMBERS)
  // =========================================================================

  /**
   * 2.1 Nhân viên bấm "Tiếp nhận" công việc
   */
  public static async notifyTaskAccepted(data: {
    title: string;
    userName: string;
  }) {
    const safeTitle = this.escapeHtml(data.title);
    const safeUser = this.escapeHtml(data.userName);

    const msg =
      `<b>TIẾP NHẬN CÔNG VIỆC</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Task: <b>${safeTitle}</b>\n` +
      `By: ${safeUser}\n` +
      `Tiến độ: Đang làm`;

    return this.sendMessage(msg.trim());
  }

  /**
   * 2.2 Nhân viên nộp báo cáo nghiệm thu
   */
  public static async notifyTaskSubmitted(data: {
    title: string;
    userName: string;
    completedSubtasks?: number;
    totalSubtasks?: number;
    completionReport?: string | null;
  }) {
    const safeTitle = this.escapeHtml(data.title);
    const safeUser = this.escapeHtml(data.userName);
    const safeReport = this.escapeHtml(data.completionReport);

    const subtaskText =
      data.totalSubtasks && data.totalSubtasks > 0
        ? `Checklist: ${data.completedSubtasks || 0}/${data.totalSubtasks}\n`
        : '';

    const msg =
      `<b>NỘP BÁO CÁO NGHIỆM THU</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Task: <b>${safeTitle}</b>\n` +
      `By: ${safeUser}\n` +
      `Tiến độ: Đang nộp duyệt\n` +
      subtaskText +
      (safeReport ? `Báo cáo: ${safeReport}` : '');

    return this.sendMessage(msg.trim());
  }

  /**
   * 2.3 Nhân viên phản hồi tham gia cuộc họp (RSVP)
   */
  public static async notifyMeetingRSVP(data: {
    title: string;
    userName: string;
    status: 'ACCEPTED' | 'DECLINED';
  }) {
    const safeTitle = this.escapeHtml(data.title);
    const safeUser = this.escapeHtml(data.userName);
    const statusText = data.status === 'ACCEPTED' ? 'Tham gia' : 'Vắng mặt';

    const msg =
      `<b>PHẢN HỒI LỊCH HỌP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Meeting: <b>${safeTitle}</b>\n` +
      `By: ${safeUser}\n` +
      `Phản hồi: ${statusText}`;

    return this.sendMessage(msg.trim());
  }

  /**
   * 2.4 Người dùng mới nhập mã phòng xin vào công ty
   */
  public static async notifyUserJoinRequest(data: {
    userName: string;
    userEmail: string;
    roomCode: string;
  }) {
    const safeUser = this.escapeHtml(data.userName);
    const safeEmail = this.escapeHtml(data.userEmail);
    const safeCode = this.escapeHtml(data.roomCode);

    const msg =
      `<b>YÊU CẦU GIA NHẬP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thành viên: ${safeUser} - ${safeEmail}\n` +
      `Mã phòng: ${safeCode}`;

    return this.sendMessage(msg.trim());
  }
}
