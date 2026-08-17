/**
 * =========================================================================
 * TELEGRAM MESSAGE TEMPLATES - MẪU TIN NHẮN THÔNG BÁO BOT TELEGRAM (TỐI GIẢN)
 * =========================================================================
 * Đảm bảo 100% không icon/emoji, trực quan, mạch lạc, dễ đọc trên mọi thiết bị.
 * =========================================================================
 */

export const TelegramTemplates = {
  /**
   * 1. MẪU GIAO VIỆC MỚI (ADMIN GIAO VIỆC CHO NHÂN VIÊN)
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
        ? `• <b>Danh sách việc con (${data.subtasks.length}):</b>\n` +
          data.subtasks.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n') +
          '\n'
        : '';

    return (
      `${tagHeader}<b>THÔNG BÁO GIAO VIỆC</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Công việc:</b> ${data.title}\n` +
      `• <b>Người giao:</b> ${data.creatorName}\n` +
      `• <b>Người phụ trách:</b> ${data.assignees}\n` +
      `• <b>Hạn hoàn thành:</b> ${data.dueDate}\n` +
      (data.description ? `• <b>Nội dung:</b> <i>${data.description}</i>\n` : '') +
      subtaskText
    ).trim();
  },

  /**
   * 2. MẪU CẢNH BÁO ĐẾN HẠN DEADLINE (NHÂN VIÊN CHƯA XONG VIỆC)
   */
  taskOverdueDeadline(data: {
    title: string;
    assignees: string;
    dueDate: string;
    telegramTag?: string;
  }): string {
    const tagHeader = data.telegramTag ? `${data.telegramTag}\n` : '';

    return (
      `${tagHeader}<b>CẢNH BÁO: ĐẾN HẠN CÔNG VIỆC CHƯA XONG</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Công việc:</b> ${data.title}\n` +
      `• <b>Người phụ trách:</b> ${data.assignees}\n` +
      `• <b>Hạn hoàn thành:</b> ${data.dueDate}\n` +
      `• <b>Tình trạng:</b> Chưa hoàn thành (Yêu cầu khẩn trương xử lý hoặc báo cáo tiến độ)`
    ).trim();
  },

  /**
   * 3. MẪU NHÂN VIÊN BÁO HOÀN THÀNH CÔNG VIỆC
   */
  taskSubmitted(data: {
    title: string;
    userName: string;
    completionTime?: string;
    completedSubtasks?: number;
    totalSubtasks?: number;
    report?: string | null;
  }): string {
    const subtaskText =
      data.totalSubtasks && data.totalSubtasks > 0
        ? `• <b>Tiến độ việc con:</b> ${data.completedSubtasks || 0}/${data.totalSubtasks}\n`
        : '';

    return (
      `<b>THÔNG BÁO HOÀN THÀNH CÔNG VIỆC</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Công việc:</b> ${data.title}\n` +
      `• <b>Người thực hiện:</b> ${data.userName}\n` +
      `• <b>Thời gian hoàn thành:</b> ${data.completionTime || 'Vừa xong'}\n` +
      subtaskText +
      (data.report ? `• <b>Báo cáo kết quả:</b> <i>${data.report}</i>` : '')
    ).trim();
  },

  /**
   * 4. MẪU SẾP DUYỆT NGHIỆM THU HOẶC YÊU CẦU SỬA LẠI
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
        `<b>THÔNG BÁO NGHIỆM THU CÔNG VIỆC</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `• <b>Công việc:</b> ${data.title}\n` +
        `• <b>Người thực hiện:</b> ${data.assigneeNames}\n` +
        `• <b>Người duyệt:</b> ${data.reviewerName}\n` +
        `• <b>Trạng thái:</b> Đã duyệt hoàn thành\n` +
        (data.feedback ? `• <b>Nhận xét:</b> <i>${data.feedback}</i>` : '')
      ).trim();
    } else {
      return (
        `<b>YÊU CẦU CHỈNH SỬA CÔNG VIỆC</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `• <b>Công việc:</b> ${data.title}\n` +
        `• <b>Người thực hiện:</b> ${data.assigneeNames}\n` +
        `• <b>Người yêu cầu:</b> ${data.reviewerName}\n` +
        `• <b>Trạng thái:</b> Cần làm lại / chỉnh sửa\n` +
        (data.feedback ? `• <b>Lý do:</b> <i>${data.feedback}</i>` : '')
      ).trim();
    }
  },

  /**
   * 5. MẪU THÔNG BÁO CUỘC HỌP (KHÔNG LINK - CHỈ THỜI GIAN BẮT ĐẦU - KHÔNG BÁO THAM GIA/VẮNG)
   */
  meetingCreated(data: {
    title: string;
    creatorName: string;
    startTime: string;
    location?: string | null;
    description?: string | null;
  }): string {
    const locText = data.location ? `• <b>Địa điểm:</b> ${data.location}\n` : '';
    const descText = data.description ? `• <b>Nội dung:</b> <i>${data.description}</i>\n` : '';

    return (
      `<b>THÔNG BÁO LỊCH HỌP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Cuộc họp:</b> ${data.title}\n` +
      `• <b>Thời gian bắt đầu:</b> ${data.startTime}\n` +
      locText +
      `• <b>Người chủ trì:</b> ${data.creatorName}\n` +
      descText
    ).trim();
  },

  /**
   * 6. MẪU HỦY LỊCH HỌP
   */
  meetingDeleted(data: { title: string; cancellerName: string }): string {
    return (
      `<b>HỦY LỊCH HỌP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Cuộc họp:</b> ${data.title}\n` +
      `• <b>Hủy bởi:</b> ${data.cancellerName}`
    );
  },

  /**
   * 7. MẪU PHÁT THÔNG BÁO KẾ HOẠCH CHUNG TOÀN CÔNG TY
   */
  announcementBroadcast(data: {
    title: string;
    content: string;
    senderName: string;
    roleTitle?: string;
    time: string;
    telegramTag?: string;
  }): string {
    const tagHeader = data.telegramTag ? `${data.telegramTag}\n` : '';

    return (
      `${tagHeader}<b>THÔNG BÁO KẾ HOẠCH</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Kế hoạch:</b> ${data.title}\n` +
      `• <b>Người lập:</b> ${data.senderName}${data.roleTitle ? ` (${data.roleTitle})` : ''}\n` +
      `• <b>Thời gian phát hành:</b> ${data.time}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Nội dung chi tiết:</b>\n` +
      `${data.content}`
    ).trim();
  },

  /**
   * 8. MẪU CHÀO MỪNG THÀNH VIÊN MỚI (TỐI GIẢN)
   */
  welcomeNewMember(data: {
    name: string;
    email: string;
    role: string;
    approverName?: string;
  }): string {
    return (
      `<b>CHÀO MỪNG THÀNH VIÊN MỚI</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Thành viên:</b> ${data.name}\n` +
      `• <b>Email:</b> <code>${data.email}</code>\n` +
      `• <b>Vai trò:</b> ${data.role}`
    );
  },

  /**
   * 9. MẪU YÊU CẦU XIN GIA NHẬP CÔNG TY
   */
  userJoinRequest(data: {
    name: string;
    email: string;
    roomCode: string;
  }): string {
    return (
      `<b>YÊU CẦU GIA NHẬP</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Thành viên:</b> ${data.name}\n` +
      `• <b>Email:</b> <code>${data.email}</code>\n` +
      `• <b>Mã phòng:</b> <code>${data.roomCode}</code>`
    );
  },

  /**
   * 10. MẪU PHẢN HỒI THAM GIA HỌP (VÔ HIỆU HÓA ĐỂ TRÁNH SPAM)
   */
  meetingRSVP(_data: {
    title: string;
    userName: string;
    status: 'ACCEPTED' | 'DECLINED';
  }): string {
    return '';
  },

  /**
   * 11. MẪU TIẾP NHẬN VIỆC (VÔ HIỆU HÓA ĐỂ TRÁNH SPAM)
   */
  taskAccepted(_data: { title: string; userName: string }): string {
    return '';
  },
};
