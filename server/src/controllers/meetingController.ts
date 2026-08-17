import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';
import { SocketService } from '../services/socketService';
import { TelegramService } from '../services/telegramService';

export class MeetingController {
  // Lấy danh sách cuộc họp của Workspace
  static async getMeetings(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { timeframe } = req.query;

      const whereClause: any = { workspaceId };
      const now = new Date();

      if (timeframe === 'upcoming') {
        whereClause.endTime = { gte: now };
      } else if (timeframe === 'past') {
        whereClause.endTime = { lt: now };
      }

      const meetings = await prisma.meeting.findMany({
        where: whereClause,
        include: {
          createdBy: { select: { id: true, name: true, email: true, avatar: true } },
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      return res.json(meetings);
    } catch (error) {
      console.error('[Get Meetings Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tải danh sách cuộc họp' });
    }
  }

  // Tạo cuộc họp mới & Tự động gửi Email thông báo toàn bộ thành viên
  static async createMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user?.role === 'MEMBER') {
        return res.status(403).json({ message: 'Nhân viên không có quyền đặt lịch họp. Chỉ Ban Giám Đốc, Thư Ký hoặc Quản Lý mới có quyền lên lịch họp.' });
      }

      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const { title, description, meetingLink, location, startTime, endTime, notifyAll, participantIds, sendEmail } = req.body;

      if (!title || !startTime) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tiêu đề và thời gian bắt đầu cuộc họp' });
      }

      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { users: true },
      });

      if (!workspace) {
        return res.status(404).json({ message: 'Không tìm thấy Workspace' });
      }

      const creator = workspace.users.find((u) => u.id === createdById);

      // Xác định danh sách người tham gia
      let targetUserIds: string[] = [];
      if (notifyAll || !participantIds || participantIds.length === 0) {
        targetUserIds = workspace.users.map((u) => u.id);
      } else {
        targetUserIds = Array.from(new Set([createdById, ...participantIds]));
      }

      const meeting = await prisma.$transaction(async (tx) => {
        const newMeeting = await tx.meeting.create({
          data: {
            title: title.trim(),
            description,
            meetingLink: meetingLink?.trim() || null,
            location: location?.trim() || null,
            startTime: start,
            endTime: end,
            notifyAll: !!notifyAll,
            workspaceId,
            createdById,
            participants: {
              create: targetUserIds.map((userId) => ({
                userId,
                status: userId === createdById ? 'ACCEPTED' : 'INVITED',
              })),
            },
          },
          include: {
            participants: {
              include: { user: true },
            },
          },
        });

        // Tạo thông báo trong Web (In-app notifications)
        for (const userId of targetUserIds) {
          if (userId !== createdById) {
            await tx.notification.create({
              data: {
                userId,
                title: '📅 Lịch họp mới',
                content: `Cuộc họp "${newMeeting.title}" lúc ${new Date(startTime).toLocaleTimeString('vi-VN')} ngày ${new Date(startTime).toLocaleDateString('vi-VN')}`,
                type: 'MEETING',
                link: `/meetings?id=${newMeeting.id}`,
              },
            });
          }
        }

        return newMeeting;
      });

      // Gửi Email thông báo bất đồng bộ
      if (sendEmail !== false) {
        const recipientEmails = workspace.users
          .filter((u) => targetUserIds.includes(u.id))
          .map((u) => u.email);

        EmailService.sendMeetingInvite(workspaceId, recipientEmails, {
          title: meeting.title,
          description: meeting.description,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          meetingLink: meeting.meetingLink,
          location: meeting.location,
          creatorName: creator?.name || 'Ban Quản Trị',
          workspaceName: workspace.name,
        }).catch((err) => console.error('[Async Email Error]', err));
      }

      // 🤖 Tự động bắn thông báo Lịch họp mới lên Telegram
      TelegramService.notifyMeetingCreated({
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        meetingLink: meeting.meetingLink,
        location: meeting.location,
        creatorName: creator?.name || 'Ban Quản Trị',
        participantCount: targetUserIds.length,
      }).catch((err) => console.error('[Telegram Meeting Notify Error]', err));

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'meeting:created', {
        meetingId: meeting.id,
        title: meeting.title,
      });
      SocketService.emitToWorkspace(workspaceId, 'notification:new', { type: 'MEETING' });

      return res.status(201).json({
        message: 'Tạo lịch họp thành công và đã gửi thông báo đến các thành viên',
        meeting,
      });
    } catch (error) {
      console.error('[Create Meeting Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tạo cuộc họp' });
    }
  }

  // Cập nhật cuộc họp
  static async updateMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;
      const { title, description, meetingLink, location, startTime, endTime } = req.body;

      const meeting = await prisma.meeting.findFirst({
        where: { id, workspaceId },
      });

      if (!meeting) {
        return res.status(404).json({ message: 'Không tìm thấy cuộc họp' });
      }

      const updated = await prisma.meeting.update({
        where: { id },
        data: {
          title: title ? title.trim() : undefined,
          description,
          meetingLink,
          location,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
        },
      });

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'meeting:updated', { meetingId: id });

      return res.json({ message: 'Cập nhật cuộc họp thành công', meeting: updated });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi cập nhật cuộc họp' });
    }
  }

  // Xóa cuộc họp
  static async deleteMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;

      const meeting = await prisma.meeting.findFirst({
        where: { id, workspaceId },
      });

      if (!meeting) {
        return res.status(404).json({ message: 'Không tìm thấy cuộc họp' });
      }

      await prisma.meeting.delete({ where: { id } });

      // 🤖 Bắn thông báo Telegram Hủy cuộc họp
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      TelegramService.notifyMeetingDeleted({
        title: meeting.title,
        cancellerName: user?.name || 'Quản trị viên',
      }).catch((err) => console.error('[Telegram Meeting Delete Error]', err));

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'meeting:deleted', { meetingId: id });

      return res.json({ message: 'Đã xóa cuộc họp thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa cuộc họp' });
    }
  }

  // Cập nhật trạng thái tham gia của cá nhân (Chấp nhận / Từ chối)
  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const { status } = req.body;

      if (!['ACCEPTED', 'DECLINED'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
      }

      const participant = await prisma.meetingParticipant.upsert({
        where: {
          meetingId_userId: {
            meetingId: id,
            userId,
          },
        },
        update: { status },
        create: {
          meetingId: id,
          userId,
          status,
        },
      });

      // 🤖 Bắn thông báo Telegram phản hồi tham gia họp (RSVP)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (meeting && user) {
        TelegramService.notifyMeetingRSVP({
          title: meeting.title,
          userName: user.name,
          status: status as 'ACCEPTED' | 'DECLINED',
        }).catch((err) => console.error('[Telegram RSVP Error]', err));
      }

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'meeting:updated', { meetingId: id });

      return res.json({ message: 'Cập nhật trạng thái tham gia thành công', participant });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật trạng thái' });
    }
  }
}

