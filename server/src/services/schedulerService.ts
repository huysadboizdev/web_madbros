import { prisma } from '../config/db';
import { TelegramService } from './telegramService';

/**
 * Scheduler Service
 * Tự động chạy nền kiểm tra deadline công việc định kỳ trên Web Server.
 * Khi công việc đến hạn / quá hạn mà nhân viên chưa hoàn thành (status != 'DONE'),
 * tự động phát thông báo cảnh báo lên Telegram (100% không icon/emoji).
 */
export class SchedulerService {
  private static intervalTimer: NodeJS.Timeout | null = null;
  // Lưu trữ thời điểm đã gửi cảnh báo cho task để tránh spam liên tục (taskId -> timestamp)
  private static alertedTasks = new Map<string, number>();

  /**
   * Khởi động scheduler quét deadline mỗi 1 phút
   */
  public static init() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    console.log('[Scheduler] Đã kích hoạt hệ thống tự động quét deadline công việc (chu kỳ 60s)...');

    // Chạy kiểm tra ngay sau 10s khởi động
    setTimeout(() => {
      this.checkOverdueTasks().catch((err) =>
        console.error('[Scheduler Error on startup check]', err)
      );
    }, 10000);

    // Lặp lại mỗi 60 giây
    this.intervalTimer = setInterval(() => {
      this.checkOverdueTasks().catch((err) =>
        console.error('[Scheduler Error in interval check]', err)
      );
    }, 60 * 1000);
  }

  /**
   * Quét và gửi cảnh báo các task đã đến hạn mà chưa hoàn thành
   */
  public static async checkOverdueTasks() {
    try {
      const now = new Date();

      // Lấy tất cả task có dueDate <= hiện tại và chưa hoàn thành (khác 'DONE')
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: {
            not: null,
            lte: now,
          },
          status: {
            not: 'DONE',
          },
        },
        include: {
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const nowTime = now.getTime();
      // Thời gian giãn cách giữa 2 lần nhắc lại cho cùng 1 task (ví dụ: 6 tiếng)
      const RE_ALERT_INTERVAL = 6 * 60 * 60 * 1000;

      for (const task of overdueTasks) {
        const lastAlertTime = this.alertedTasks.get(task.id);
        if (lastAlertTime && nowTime - lastAlertTime < RE_ALERT_INTERVAL) {
          // Đã cảnh báo gần đây, bỏ qua để tránh spam
          continue;
        }

        const assigneeNames = task.assignees.map((a) => a.user.name);

        await TelegramService.notifyTaskOverdueDeadline({
          title: task.title,
          assignees: assigneeNames,
          dueDate: task.dueDate,
        });

        // Đánh dấu đã cảnh báo task này
        this.alertedTasks.set(task.id, nowTime);
        console.log(`[Scheduler] Đã gửi cảnh báo deadline task #${task.id}: "${task.title}"`);
      }
    } catch (error) {
      console.error('[Scheduler checkOverdueTasks Error]', error);
    }
  }

  /**
   * Dừng scheduler nếu cần
   */
  public static stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      console.log('[Scheduler] Đã dừng hệ thống tự động quét deadline.');
    }
  }
}
