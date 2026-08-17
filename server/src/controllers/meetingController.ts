import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';

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
      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const { title, description, meetingLink, location, startTime, endTime, notifyAll, participantIds, sendEmail } = req.body;

      if (!title || !startTime || !endTime) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tiêu đề, thời gian bắt đầu và kết thúc' });
      }

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
            meetingLink,
            location,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
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

      return res.json({ message: 'Cập nhật trạng thái tham gia thành công', participant });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi cập nhật trạng thái' });
    }
  }
}
