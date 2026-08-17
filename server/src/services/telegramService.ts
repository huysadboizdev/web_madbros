import { TelegramTemplates } from '../templates/telegramTemplates';

/**
 * Telegram Notification Service
 * Tự động gửi thông báo từ Web lên Nhóm/Kênh Telegram thông qua TelegramTemplates (Tối giản)
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
  public static formatDateTime(date?: Date | string | null): string {
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
    if (!htmlMessage || !htmlMessage.trim()) {
      return false;
    }

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
              disable_web_page_preview: true,
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
    priority?: string;
    dueDate?: Date | string | null;
    creatorName: string;
    assignees: string[];
    subtasks?: string[];
    telegramTag?: string | null;
  }) {
    const msg = TelegramTemplates.taskCreated({
      title: this.escapeHtml(data.title),
      creatorName: this.escapeHtml(data.creatorName),
      assignees: this.escapeHtml(data.assignees.length > 0 ? data.assignees.join(', ') : 'Chưa phân công'),
      dueDate: this.formatDateTime(data.dueDate),
      description: this.escapeHtml(data.description),
      subtasks: data.subtasks?.map((s) => this.escapeHtml(s)),
      telegramTag: this.formatTelegramTag(data.telegramTag),
    });

    return this.sendMessage(msg);
  }

  /**
   * 1.2 Cảnh báo đến hạn / quá hạn công việc chưa xong
   */
  public static async notifyTaskOverdueDeadline(data: {
    title: string;
    assignees: string[];
    dueDate?: Date | string | null;
    telegramTag?: string | null;
  }) {
    const msg = TelegramTemplates.taskOverdueDeadline({
      title: this.escapeHtml(data.title),
      assignees: this.escapeHtml(data.assignees.length > 0 ? data.assignees.join(', ') : 'Nhân sự phụ trách'),
      dueDate: this.formatDateTime(data.dueDate),
      telegramTag: this.formatTelegramTag(data.telegramTag),
    });

    return this.sendMessage(msg);
  }

  /**
   * 1.3 Lên lịch họp mới (Tạo Meeting) - Không link, chỉ thời gian bắt đầu
   */
  public static async notifyMeetingCreated(data: {
    title: string;
    description?: string | null;
    startTime: Date | string;
    endTime?: Date | string;
    meetingLink?: string | null;
    location?: string | null;
    creatorName: string;
    participantCount?: number;
  }) {
    const msg = TelegramTemplates.meetingCreated({
      title: this.escapeHtml(data.title),
      creatorName: this.escapeHtml(data.creatorName),
      startTime: this.formatDateTime(data.startTime),
      location: this.escapeHtml(data.location),
      description: this.escapeHtml(data.description),
    });

    return this.sendMessage(msg);
  }

  /**
   * 1.4 Phát Thông Báo Kế Hoạch Chung (Announcement Broadcast)
   */
  public static async notifyAnnouncementBroadcast(data: {
    title: string;
    content: string;
    priority?: string;
    senderName: string;
    roleTitle?: string;
    telegramTag?: string | null;
  }) {
    const msg = TelegramTemplates.announcementBroadcast({
      title: this.escapeHtml(data.title),
      content: this.escapeHtml(data.content),
      senderName: this.escapeHtml(data.senderName),
      roleTitle: this.escapeHtml(data.roleTitle || 'Ban Quản Trị'),
      time: this.formatDateTime(new Date()),
      telegramTag: this.formatTelegramTag(data.telegramTag),
    });

    return this.sendMessage(msg);
  }

  /**
   * 1.5 Chào mừng thành viên mới
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

    const msg = TelegramTemplates.welcomeNewMember({
      name: this.escapeHtml(data.userName),
      email: this.escapeHtml(data.userEmail),
      role: roleText,
      approverName: this.escapeHtml(data.approverName || 'Quản Trị Viên'),
    });

    return this.sendMessage(msg);
  }

  /**
   * 1.6 Sếp duyệt nghiệm thu hoặc Yêu cầu làm lại task
   */
  public static async notifyTaskReviewed(data: {
    title: string;
    reviewerName: string;
    assigneeNames: string[];
    action: 'APPROVE' | 'REJECT';
    feedback?: string | null;
  }) {
    const msg = TelegramTemplates.taskReviewed({
      title: this.escapeHtml(data.title),
      reviewerName: this.escapeHtml(data.reviewerName),
      assigneeNames: this.escapeHtml(data.assigneeNames.join(', ') || 'Nhân viên'),
      action: data.action,
      feedback: this.escapeHtml(data.feedback),
    });

    return this.sendMessage(msg);
  }

  /**
   * 1.7 Hủy cuộc họp
   */
  public static async notifyMeetingDeleted(data: {
    title: string;
    cancellerName: string;
  }) {
    const msg = TelegramTemplates.meetingDeleted({
      title: this.escapeHtml(data.title),
      cancellerName: this.escapeHtml(data.cancellerName),
    });

    return this.sendMessage(msg);
  }

  // =========================================================================
  // 2. CÁC THÔNG BÁO TỪ PHÍA NHÂN VIÊN (MEMBERS)
  // =========================================================================

  /**
   * 2.1 Nhân viên bấm "Tiếp nhận" công việc (Đã tắt để tránh loãng nhóm)
   */
  public static async notifyTaskAccepted(_data: {
    title: string;
    userName: string;
  }) {
    // Tối giản: Không bắn tin nhắn nhận việc trung gian lên Telegram
    return false;
  }

  /**
   * 2.2 Nhân viên nộp báo cáo hoàn thành công việc
   */
  public static async notifyTaskSubmitted(data: {
    title: string;
    userName: string;
    completedSubtasks?: number;
    totalSubtasks?: number;
    completionReport?: string | null;
  }) {
    const msg = TelegramTemplates.taskSubmitted({
      title: this.escapeHtml(data.title),
      userName: this.escapeHtml(data.userName),
      completionTime: this.formatDateTime(new Date()),
      completedSubtasks: data.completedSubtasks,
      totalSubtasks: data.totalSubtasks,
      report: this.escapeHtml(data.completionReport),
    });

    return this.sendMessage(msg);
  }

  /**
   * 2.3 Nhân viên phản hồi tham gia cuộc họp (RSVP) - Đã tắt để tránh spam
   */
  public static async notifyMeetingRSVP(_data: {
    title: string;
    userName: string;
    status: 'ACCEPTED' | 'DECLINED';
  }) {
    // Tối giản: Không bắn tin nhắn điểm danh/báo vắng lên Telegram
    return false;
  }

  /**
   * 2.4 Người dùng mới nhập mã phòng xin vào công ty
   */
  public static async notifyUserJoinRequest(data: {
    userName: string;
    userEmail: string;
    roomCode: string;
  }) {
    const msg = TelegramTemplates.userJoinRequest({
      name: this.escapeHtml(data.userName),
      email: this.escapeHtml(data.userEmail),
      roomCode: this.escapeHtml(data.roomCode),
    });

    return this.sendMessage(msg);
  }
}
