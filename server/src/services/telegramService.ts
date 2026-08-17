/**
 * Telegram Notification Service
 * Tự động gửi thông báo 2 chiều từ hệ thống Web MadBros lên Nhóm/Kênh Telegram
 */

export class TelegramService {
  private static getCredentials() {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const rawChatId = process.env.TELEGRAM_CHAT_ID || process.env.MAIN_GROUP_ID || '';
    const rawChannelId = process.env.TELEGRAM_CHANNEL_ID || '';
    const isEnabled = process.env.TELEGRAM_ENABLED !== 'false';

    // Gom toàn bộ Chat ID của Group và Channel (hỗ trợ cách nhau bằng dấu phẩy)
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
   * Helper format ngày giờ theo múi giờ Việt Nam
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
   * Helper format huy hiệu mức độ ưu tiên
   */
  private static getPriorityBadge(priority: string): string {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
        return '🔴 <b>KHẨN CẤP</b>';
      case 'HIGH':
        return '🟡 <b>CAO</b>';
      case 'MEDIUM':
        return '🔵 <b>TRUNG BÌNH</b>';
      case 'LOW':
        return '⚪ <b>THẤP</b>';
      default:
        return '🔵 <b>BÌNH THƯỜNG</b>';
    }
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
      console.log('\n[TelegramService Mock Log]');
      console.log('----------------------------------------------------');
      console.log(htmlMessage.replace(/<[^>]*>?/gm, '')); // In sạch text nếu chưa cấu hình token
      console.log('----------------------------------------------------\n');
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
            console.error(`[TelegramService Error Chat ${chatId}]`, data.description || 'Lỗi gửi tin Telegram');
            allSuccess = false;
          }
        } catch (err: any) {
          console.error(`[TelegramService Network Error Chat ${chatId}]`, err.message);
          allSuccess = false;
        }
      })
    );

    return allSuccess;
  }

  // =========================================================================
  // 1. CÁC THÔNG BÁO TỪ PHÍA ADMIN & THƯ KÝ
  // =========================================================================

  /**
   * 1.1 Giao việc mới (Tạo Task) - Có Tag Telegram @username
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
    const tagHeader = tagFormatted ? `🔔 ${tagFormatted} ` : '📋 ';
    const tagAssigneeText = tagFormatted ? ` (${tagFormatted})` : '';

    const subtaskText =
      data.subtasks && data.subtasks.length > 0
        ? `\n📌 <b>Checklist (${data.subtasks.length} mục):</b>\n` +
          data.subtasks.map((s, idx) => `   ${idx + 1}. ${s}`).join('\n')
        : '';

    const msg =
      `${tagHeader}<b>[GIAO VIỆC MỚI] ⚡</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Công việc:</b> <b>${data.title}</b>\n` +
      `🎯 <b>Mức độ:</b> ${this.getPriorityBadge(data.priority)}\n` +
      `👑 <b>Người giao:</b> ${data.creatorName}\n` +
      `👤 <b>Phụ trách:</b> <code>${assigneeList}</code>${tagAssigneeText}\n` +
      `⏰ <b>Hạn hoàn thành:</b> ${this.formatDateTime(data.dueDate)}\n` +
      (data.description ? `📝 <b>Mô tả:</b> <i>${data.description}</i>\n` : '') +
      subtaskText +
      `\n━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Nhân viên được giao vui lòng vào Web để bấm [Tiếp Nhận]!</i>`;

    return this.sendMessage(msg);
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
    const linkText = data.meetingLink
      ? `🔗 <b>Link phòng họp:</b> <a href="${data.meetingLink}">${data.meetingLink}</a>\n`
      : '';
    const locText = data.location ? `📍 <b>Địa điểm:</b> ${data.location}\n` : '';

    const msg =
      `📅 <b>[LỊCH HỌP CÔNG TY MỚI] 📢</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Chủ đề:</b> <b>${data.title}</b>\n` +
      `⏰ <b>Bắt đầu:</b> ${this.formatDateTime(data.startTime)}\n` +
      `⌛ <b>Kết thúc:</b> ${this.formatDateTime(data.endTime)}\n` +
      linkText +
      locText +
      `👑 <b>Người tổ chức:</b> ${data.creatorName}\n` +
      `👥 <b>Thành phần:</b> Toàn thể thành viên (${data.participantCount || 'Tất cả'} người)\n` +
      (data.description ? `📝 <b>Nội dung:</b> <i>${data.description}</i>\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Vui lòng truy cập Web để xác nhận tham gia (RSVP)!</i>`;

    return this.sendMessage(msg);
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
    const tagHeader = tagFormatted ? `🔔 ${tagFormatted} ` : '';
    const priorityIcon =
      data.priority === 'URGENT'
        ? '🚨 <b>[THÔNG BÁO KHẨN CẤP TOÀN CÔNG TY]</b>'
        : data.priority === 'IMPORTANT'
        ? '🔥 <b>[THÔNG BÁO QUAN TRỌNG]</b>'
        : '📢 <b>[THÔNG BÁO NỘI BỘ DOANH NGHIỆP]</b>';

    const safeTitle = this.escapeHtml(data.title);
    const safeContent = this.escapeHtml(data.content);
    const safeSender = this.escapeHtml(data.senderName);
    const safeRole = this.escapeHtml(data.roleTitle || 'Ban Giám Đốc');

    const msg =
      `${tagHeader}${priorityIcon}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Tiêu đề:</b> <b>${safeTitle}</b>\n` +
      `👑 <b>Người phát:</b> ${safeSender} (<i>${safeRole}</i>)\n` +
      `⏰ <b>Thời gian:</b> ${this.formatDateTime(new Date())}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 <b>Nội dung thông báo:</b>\n` +
      `${safeContent}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Toàn thể cán bộ nhân viên lưu ý thực hiện nghiêm túc!</i>`;

    return this.sendMessage(msg);
  }

  /**
   * 1.4 Admin duyệt thành viên mới gia nhập công ty
   */
  public static async notifyUserApproved(data: {
    userName: string;
    userEmail: string;
    role: string;
    approverName: string;
  }) {
    const roleText =
      data.role === 'ADMIN' ? '👑 Quản Trị Viên' : data.role === 'SECRETARY' ? '💼 Thư Ký' : '👤 Thành Viên';

    const msg =
      `🎉 <b>[CHÀO MỪNG THÀNH VIÊN MỚI] 🚀</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👋 Nhiệt liệt chào mừng thành viên mới gia nhập công ty:\n` +
      `👤 <b>Họ và tên:</b> <b>${data.userName}</b>\n` +
      `📧 <b>Email:</b> <code>${data.userEmail}</code>\n` +
      `💼 <b>Vai trò:</b> ${roleText}\n` +
      `👑 <b>Người phê duyệt:</b> ${data.approverName}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎊 <i>Chúc bạn có trải nghiệm làm việc hiệu quả tại MadBros!</i>`;

    return this.sendMessage(msg);
  }

  /**
   * 1.4 Sếp duyệt nghiệm thu hoặc Yêu cầu làm lại task
   */
  public static async notifyTaskReviewed(data: {
    title: string;
    reviewerName: string;
    assigneeNames: string[];
    action: 'APPROVE' | 'REJECT';
    feedback?: string | null;
  }) {
    const assigneeStr = data.assigneeNames.join(', ') || 'Nhân viên';

    if (data.action === 'APPROVE') {
      const msg =
        `🏆 <b>[NGHIỆM THU THÀNH CÔNG] ✅</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 <b>Công việc:</b> <b>${data.title}</b>\n` +
        `👤 <b>Người thực hiện:</b> <code>${assigneeStr}</code>\n` +
        `👑 <b>Đã duyệt bởi:</b> ${data.reviewerName}\n` +
        (data.feedback ? `⭐ <b>Đánh giá:</b> <i>${data.feedback}</i>\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 <b>Tiến độ:</b> ĐÃ HOÀN THÀNH 100% 🏅`;
      return this.sendMessage(msg);
    } else {
      const msg =
        `⚠️ <b>[YÊU CẦU LÀM LẠI CÔNG VIỆC] 🔄</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 <b>Công việc:</b> <b>${data.title}</b>\n` +
        `👤 <b>Người thực hiện:</b> <code>${assigneeStr}</code>\n` +
        `👑 <b>Người yêu cầu:</b> ${data.reviewerName}\n` +
        (data.feedback ? `📝 <b>Lý do / Cần sửa:</b> <i>${data.feedback}</i>\n` : '') +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 <i>Vui lòng kiểm tra lại yêu cầu trên Web và nộp lại báo cáo mới!</i>`;
      return this.sendMessage(msg);
    }
  }

  /**
   * 1.5 Hủy cuộc họp
   */
  public static async notifyMeetingDeleted(data: {
    title: string;
    cancellerName: string;
  }) {
    const msg =
      `❌ <b>[HỦY LỊCH HỌP] 📢</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Cuộc họp:</b> <b>${data.title}</b>\n` +
      `👑 <b>Người hủy:</b> ${data.cancellerName}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <i>Cuộc họp trên đã được hủy. Mọi người chú ý cập nhật lại lịch làm việc!</i>`;

    return this.sendMessage(msg);
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
    const msg =
      `⚡ <b>[ĐÃ TIẾP NHẬN CÔNG VIỆC] 🚀</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Công việc:</b> <b>${data.title}</b>\n` +
      `👤 <b>Nhân viên:</b> <b>${data.userName}</b>\n` +
      `⏱️ <b>Trạng thái:</b> Đã bắt đầu thực hiện (In Progress)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💪 <i>Chúc bạn hoàn thành xuất sắc công việc đúng hạn!</i>`;

    return this.sendMessage(msg);
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
    const subtaskText =
      data.totalSubtasks && data.totalSubtasks > 0
        ? `📊 <b>Tiến độ checklist:</b> ${data.completedSubtasks || 0}/${data.totalSubtasks} việc (${Math.round(((data.completedSubtasks || 0) / data.totalSubtasks) * 100)}%)\n`
        : '';

    const msg =
      `📝 <b>[NỘP BÁO CÁO NGHIỆM THU] ⚡</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Công việc:</b> <b>${data.title}</b>\n` +
      `👤 <b>Người nộp:</b> <b>${data.userName}</b>\n` +
      subtaskText +
      (data.completionReport ? `🔗 <b>Báo cáo/Link kết quả:</b> <i>${data.completionReport}</i>\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Sếp / Thư ký vui lòng vào Web để kiểm tra và duyệt nghiệm thu!</i>`;

    return this.sendMessage(msg);
  }

  /**
   * 2.3 Nhân viên phản hồi tham gia cuộc họp (RSVP)
   */
  public static async notifyMeetingRSVP(data: {
    title: string;
    userName: string;
    status: 'ACCEPTED' | 'DECLINED';
  }) {
    const statusText =
      data.status === 'ACCEPTED'
        ? '✅ <b>SẼ THAM GIA (Accepted)</b>'
        : '❌ <b>XIN PHÉP VẮNG MẶT (Declined)</b>';

    const msg =
      `🗳️ <b>[PHẢN HỒI THAM GIA HỌP]</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 <b>Cuộc họp:</b> <b>${data.title}</b>\n` +
      `👤 <b>Thành viên:</b> <b>${data.userName}</b>\n` +
      `📊 <b>Phản hồi:</b> ${statusText}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    return this.sendMessage(msg);
  }

  /**
   * 2.4 Người dùng mới nhập mã phòng xin vào công ty
   */
  public static async notifyUserJoinRequest(data: {
    userName: string;
    userEmail: string;
    roomCode: string;
  }) {
    const msg =
      `🔔 <b>[YÊU CẦU GIA NHẬP CÔNG TY MỚI] ⚡</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Người xin vào:</b> <b>${data.userName}</b>\n` +
      `📧 <b>Email:</b> <code>${data.userEmail}</code>\n` +
      `🔑 <b>Mã phòng:</b> <code>${data.roomCode}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 <i>Quản trị viên vui lòng vào Web để [Phê Duyệt]!</i>`;

    return this.sendMessage(msg);
  }
}
