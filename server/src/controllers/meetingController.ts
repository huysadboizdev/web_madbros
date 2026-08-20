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

  // Tạo cuộc họp mới & Tự động gửi thông báo Telegram và Web đến toàn bộ thành viên
  static async createMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const { title, description, priority, meetingLink, link, location, startTime, endTime, notifyAll, participantIds, sendEmail } = req.body;

      if (!title || !startTime) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tiêu đề và thời gian bắt đầu cuộc họp' });
      }
      if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
        return res.status(400).json({ message: 'Mức độ ưu tiên cuộc họp không hợp lệ' });
      }

      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
      const finalMeetingLink = (meetingLink || link)?.trim() || null;

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
            priority: priority || 'MEDIUM',
            meetingLink: finalMeetingLink,
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
                title: `${newMeeting.priority === 'URGENT' ? '🔴' : newMeeting.priority === 'HIGH' ? '🟠' : newMeeting.priority === 'LOW' ? '🔵' : '🟡'} Lịch họp mới`,
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

        if (recipientEmails.length > 0) {
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
      }

      // 🤖 Tự động bắn thông báo Lịch họp mới lên Telegram (Tối giản: không link, chỉ giờ bắt đầu)
      TelegramService.notifyMeetingCreated({
        title: meeting.title,
        description: meeting.description,
        priority: meeting.priority,
        startTime: meeting.startTime,
        location: meeting.location,
        creatorName: creator?.name || 'Ban Quản Trị',
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
      const { title, description, priority, meetingLink, link, location, startTime, endTime, notifyAll, participantIds } = req.body;

      if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
        return res.status(400).json({ message: 'Mức độ ưu tiên cuộc họp không hợp lệ' });
      }

      const meeting = await prisma.meeting.findFirst({
        where: { id, workspaceId },
        include: { participants: true },
      });

      if (!meeting) {
        return res.status(404).json({ message: 'Không tìm thấy cuộc họp' });
      }

      const finalMeetingLink = (meetingLink !== undefined ? meetingLink : link) !== undefined 
        ? ((meetingLink || link)?.trim() || null) 
        : undefined;

      const updated = await prisma.$transaction(async (tx) => {
        const updateData: any = {
          title: title !== undefined ? title.trim() : undefined,
          description: description !== undefined ? description : undefined,
          priority: priority !== undefined ? priority : undefined,
          location: location !== undefined ? (location ? location.trim() : null) : undefined,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : (startTime ? new Date(new Date(startTime).getTime() + 60 * 60 * 1000) : undefined),
          notifyAll: notifyAll !== undefined ? !!notifyAll : undefined,
        };

        if (finalMeetingLink !== undefined) {
          updateData.meetingLink = finalMeetingLink;
        }

        const result = await tx.meeting.update({
          where: { id },
          data: updateData,
          include: {
            createdBy: { select: { id: true, name: true, email: true, avatar: true } },
            participants: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
              },
            },
          },
        });

        if (participantIds && Array.isArray(participantIds)) {
          await tx.meetingParticipant.deleteMany({ where: { meetingId: id } });
          const allTargetIds = Array.from(new Set([meeting.createdById, ...participantIds]));
          if (allTargetIds.length > 0) {
            await tx.meetingParticipant.createMany({
              data: allTargetIds.map((userId) => ({
                meetingId: id,
                userId,
                status: userId === meeting.createdById ? 'ACCEPTED' : 'INVITED',
              })),
            });
          }
        }

        return result;
      });

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'meeting:updated', { meetingId: id, meeting: updated });

      return res.json({ message: 'Cập nhật cuộc họp thành công', meeting: updated });
    } catch (error) {
      console.error('[Update Meeting Error]', error);
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

      // (Đã tắt bắn thông báo RSVP lên Telegram để tránh làm phiền nhóm)

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'meeting:updated', { meetingId: id });

      return res.json({ message: 'Cập nhật trạng thái tham gia thành công', participant });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật trạng thái' });
    }
  }
}
