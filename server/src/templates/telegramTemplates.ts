/**
 * =========================================================================
 * 💌 TELEGRAM MESSAGE TEMPLATES - MẪU TIN NHẮN THÔNG BÁO BOT TELEGRAM
 * =========================================================================
 * Bạn có thể tự do mở file này để chỉnh sửa câu chữ, thêm bớt icon,
 * đổi cấu trúc dòng hoặc biến tấu theo phong cách riêng của công ty!
 * =========================================================================
 */

export const TelegramTemplates = {
  /**
   * 1. MẪU CHÀO MỪNG THÀNH VIÊN MỚI (KHI ĐƯỢC DUYỆT VÀO CÔNG TY)
   * -------------------------------------------------------------
   * Dưới đây là các biến có sẵn:
   * - data.name: Tên thành viên (VD: Minh Vũ)
   * - data.email: Email (VD: vungocminh2k38btx@gmail.com)
   * - data.role: Vai trò (VD: Thành Viên / Thư Ký / Quản Trị Viên)
   * - data.approverName: Người phê duyệt (VD: Quản Trị Viên)
   */
  welcomeNewMember(data: {
    name: string;
    email: string;
    role: string;
    approverName?: string;
  }): string {
    // MẪU 1: Kiểu đầy đủ chi tiết có icon (Bạn có thể bật mẫu này hoặc sửa trực tiếp)
    /*
    return (
      `👋 Nhiệt liệt chào mừng thành viên mới gia nhập công ty:\n` +
      `👤 Họ và tên: <b>${data.name}</b>\n` +
      `📧 Email: <code>${data.email}</code>\n` +
      `💼 Vai trò: ${data.role}\n` +
      `👑 Người phê duyệt: ${data.approverName || 'Quản Trị Viên'}`
    );
    */

    // MẪU 2: Kiểu ngắn gọn, súc tích (Đang được kích hoạt mặc định)
    return (
      `<b>CHÀO MỪNG THÀNH VIÊN MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thành viên mới: <b>${data.name}</b> - <code>${data.email}</code> - ${data.role}`
    );
  },

  /**
   * 2. MẪU GIAO VIỆC MỚI (TẠO TASK)
   */
  taskCreated(data: {
    title: string;
    creatorName: string;
    assignees: string;
    dueDate: string;
    description?: string;
    subtasks?: string[];
    telegramTag?: string;
  }): string {
    const tagHeader = data.telegramTag ? `${data.telegramTag}\n` : '';
    const subtaskText =
      data.subtasks && data.subtasks.length > 0
        ? `Checklist (${data.subtasks.length}):\n` +
          data.subtasks.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n') +
          '\n'
        : '';

    return (
      `${tagHeader}<b>GIAO VIỆC MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Task: <b>${data.title}</b>\n` +
      `By: ${data.creatorName}\n` +
      `Phụ trách: <code>${data.assignees}</code>\n` +
      `Tiến độ: Chưa làm\n` +
      `Hạn: ${data.dueDate}\n` +
      (data.description ? `Mô tả: <i>${data.description}</i>\n` : '') +
      subtaskText
    ).trim();
  },

  /**
   * 3. MẪU NHÂN VIÊN TIẾP NHẬN CÔNG VIỆC
   */
  taskAccepted(data: { title: string; userName: string }): string {
    return (
      `<b>TIẾP NHẬN CÔNG VIỆC</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Task: <b>${data.title}</b>\n` +
      `By: ${data.userName}\n` +
      `Tiến độ: Đang làm`
    );
  },

  /**
   * 4. MẪU NHÂN VIÊN NỘP BÁO CÁO NGHIỆM THU
   */
  taskSubmitted(data: {
    title: string;
    userName: string;
    completedSubtasks?: number;
    totalSubtasks?: number;
    report?: string | null;
  }): string {
    const subtaskText =
      data.totalSubtasks && data.totalSubtasks > 0
        ? `Checklist: ${data.completedSubtasks || 0}/${data.totalSubtasks}\n`
        : '';

    return (
      `<b>NỘP BÁO CÁO NGHIỆM THU</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Task: <b>${data.title}</b>\n` +
      `By: ${data.userName}\n` +
      `Tiến độ: Đang nộp duyệt\n` +
      subtaskText +
      (data.report ? `Báo cáo: <i>${data.report}</i>` : '')
    ).trim();
  },

  /**
   * 5. MẪU SẾP DUYỆT NGHIỆM THU HOẶC YÊU CẦU SỬA LẠI
   */
  taskReviewed(data: {
    title: string;
    reviewerName: string;
    assigneeNames: string;
    action: 'APPROVE' | 'REJECT';
    feedback?: string | null;
  }): string {
    if (data.action === 'APPROVE') {
      return (
        `<b>NGHIỆM THU THÀNH CÔNG</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Task: <b>${data.title}</b>\n` +
        `By: ${data.assigneeNames}\n` +
        `Duyệt bởi: ${data.reviewerName}\n` +
        (data.feedback ? `Đánh giá: <i>${data.feedback}</i>\n` : '') +
        `Tiến độ: Hoàn thành`
      ).trim();
    } else {
      return (
        `<b>YÊU CẦU LÀM LẠI CÔNG VIỆC</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Task: <b>${data.title}</b>\n` +
        `By: ${data.assigneeNames}\n` +
        `Yêu cầu bởi: ${data.reviewerName}\n` +
        (data.feedback ? `Lý do: <i>${data.feedback}</i>\n` : '') +
        `Tiến độ: Đang làm`
      ).trim();
    }
  },

  /**
   * 6. MẪU PHÁT THÔNG BÁO CHUNG TOÀN CÔNG TY (BROADCAST)
   */
  announcementBroadcast(data: {
    title: string;
    content: string;
    senderName: string;
    roleTitle: string;
    time: string;
    telegramTag?: string;
  }): string {
    const tagHeader = data.telegramTag ? `${data.telegramTag}\n` : '';

    return (
      `${tagHeader}📌 <b>${data.title}</b>\n` +
      `By: ${data.senderName} - ${data.roleTitle}\n` +
      `Time: ${data.time}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 ${data.content}`
    ).trim();
  },

  /**
   * 7. MẪU LÊN LỊCH HỌP MỚI
   */
  meetingCreated(data: {
    title: string;
    creatorName: string;
    startTime: string;
    endTime: string;
    link?: string | null;
    location?: string | null;
    description?: string | null;
  }): string {
    const linkText = data.link ? `Link: <a href="${data.link}">${data.link}</a>\n` : '';
    const locText = data.location ? `Địa điểm: ${data.location}\n` : '';
    const descText = data.description ? `Nội dung: <i>${data.description}</i>\n` : '';

    return (
      `<b>LỊCH HỌP MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Meeting: <b>${data.title}</b>\n` +
      `By: ${data.creatorName}\n` +
      `Bắt đầu: ${data.startTime}\n` +
      `Kết thúc: ${data.endTime}\n` +
      linkText +
      locText +
      descText
    ).trim();
  },

  /**
   * 8. MẪU HỦY LỊCH HỌP
   */
  meetingDeleted(data: { title: string; cancellerName: string }): string {
    return (
      `<b>HỦY LỊCH HỌP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Meeting: <b>${data.title}</b>\n` +
      `Hủy bởi: ${data.cancellerName}`
    );
  },

  /**
   * 9. MẪU PHẢN HỒI THAM GIA HỌP (RSVP)
   */
  meetingRSVP(data: {
    title: string;
    userName: string;
    status: 'ACCEPTED' | 'DECLINED';
  }): string {
    const statusText = data.status === 'ACCEPTED' ? 'Tham gia' : 'Vắng mặt';
    return (
      `<b>PHẢN HỒI LỊCH HỌP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Meeting: <b>${data.title}</b>\n` +
      `By: ${data.userName}\n` +
      `Phản hồi: ${statusText}`
    );
  },

  /**
   * 10. MẪU YÊU CẦU XIN GIA NHẬP CÔNG TY
   */
  userJoinRequest(data: {
    name: string;
    email: string;
    roomCode: string;
  }): string {
    return (
      `<b>YÊU CẦU GIA NHẬP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Thành viên: <b>${data.name}</b> - <code>${data.email}</code>\n` +
      `Mã phòng: <code>${data.roomCode}</code>`
    );
  },
};
