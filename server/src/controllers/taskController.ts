import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';
import { SocketService } from '../services/socketService';
import { TelegramService } from '../services/telegramService';
import { TASK_UPLOAD_DIR } from '../middlewares/taskUpload';
import path from 'path';
import fs from 'fs';

const taskDetailsInclude = {
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  assignees: {
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
  subtasks: {
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  submissions: {
    include: {
      submittedBy: { select: { id: true, name: true, avatar: true } },
      reviewedBy: { select: { id: true, name: true } },
      attachments: { orderBy: { createdAt: 'asc' as const } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  activities: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
};

const formatTask = (task: any) => {
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((item: any) => item.isCompleted).length;
  const progress = totalSubtasks > 0
    ? Math.round((completedSubtasks / totalSubtasks) * 100)
    : task.status === 'DONE' ? 100 : 0;
  const latestSubmission = task.submissions?.[0] || null;

  return {
    ...task,
    progress,
    totalSubtasks,
    completedSubtasks,
    completionReport: latestSubmission?.note ?? task.completionNote,
    submittedAt: latestSubmission?.createdAt ?? null,
    reviewedAt: latestSubmission?.reviewedAt ?? null,
    assignees: task.assignees.map((assignee: any) => ({
      id: assignee.user.id,
      name: assignee.user.name,
      email: assignee.user.email,
      avatar: assignee.user.avatar,
      acceptanceStatus: assignee.status,
      acceptedAt: assignee.acceptedAt,
      declinedReason: assignee.declinedReason,
    })),
  };
};

const removeUploadedFiles = (files: Express.Multer.File[] = []) => {
  for (const file of files) {
    fs.promises.unlink(file.path).catch(() => undefined);
  }
};

export class TaskController {
  // Lấy danh sách công việc của Workspace
  static async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { status, priority, search } = req.query;

      const whereClause: any = { workspaceId };
      if (req.user!.role === 'MEMBER') {
        whereClause.AND = [{
          OR: [
            { assignees: { none: {} } },
            { assignees: { some: { userId: req.user!.userId } } },
          ],
        }];
      }
      if (status) whereClause.status = String(status);
      if (priority) whereClause.priority = String(priority);
      if (search) {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { title: { contains: String(search) } },
              { description: { contains: String(search) } },
            ],
          },
        ];
      }

      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: taskDetailsInclude,
        orderBy: { createdAt: 'desc' },
      });

      const formattedTasks = tasks.map(formatTask);

      return res.json(formattedTasks);
    } catch (error) {
      console.error('[Get Tasks Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tải danh sách công việc' });
    }
  }

  static async getTaskById(req: AuthenticatedRequest, res: Response) {
    try {
      const task = await prisma.task.findFirst({
        where: {
          id: String(req.params.id),
          workspaceId: req.user!.workspaceId,
          ...(req.user!.role === 'MEMBER'
            ? {
                OR: [
                  { assignees: { none: {} } },
                  { assignees: { some: { userId: req.user!.userId } } },
                ],
              }
            : {}),
        },
        include: taskDetailsInclude,
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc hoặc bạn không có quyền xem' });
      }

      return res.json(formatTask(task));
    } catch (error) {
      console.error('[Get Task Detail Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tải chi tiết công việc' });
    }
  }

  static async downloadAttachment(req: AuthenticatedRequest, res: Response) {
    try {
      const attachment = await prisma.taskAttachment.findUnique({
        where: { id: String(req.params.attachmentId) },
        include: {
          submission: {
            include: {
              task: { include: { assignees: { select: { userId: true } } } },
            },
          },
        },
      });

      const task = attachment?.submission.task;
      const isAssigned = task?.assignees.some((item) => item.userId === req.user!.userId);
      if (!attachment || !task || task.workspaceId !== req.user!.workspaceId || (req.user!.role === 'MEMBER' && !isAssigned)) {
        return res.status(404).json({ message: 'Không tìm thấy file hoặc bạn không có quyền tải file này' });
      }

      const filePath = path.join(TASK_UPLOAD_DIR, attachment.storedName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File không còn tồn tại trên máy chủ' });
      }

      res.setHeader('Content-Type', attachment.mimeType);
      return res.download(filePath, attachment.originalName);
    } catch (error) {
      console.error('[Download Task Attachment Error]', error);
      return res.status(500).json({ message: 'Không thể tải file' });
    }
  }

  // Tạo công việc cha mới & Gửi Email + Thông báo Web cho nhân viên được giao
  static async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user?.role === 'MEMBER') {
        return res.status(403).json({ message: 'Nhân viên không có quyền giao việc. Chỉ Ban Giám Đốc, Thư Ký hoặc Quản Lý mới có quyền phân công việc.' });
      }

      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const { title, description, priority, subtasks, sendEmail, telegramTag } = req.body;
      const assigneeIds: string[] = [];

      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Tên công việc không được để trống' });
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { users: true },
      });

      const creator = workspace?.users.find((u) => u.id === createdById);

      // Nếu có assignees và không phải tự giao cho mình -> Ban đầu trạng thái là PENDING_ACCEPT
      const hasAssignees = Array.isArray(assigneeIds) && assigneeIds.length > 0;
      const hasOtherAssignees = hasAssignees && assigneeIds.some((id: string) => id !== createdById);
      const initialStatus = !hasAssignees ? 'PENDING_ACCEPT' : hasOtherAssignees ? 'PENDING_ACCEPT' : 'IN_PROGRESS';

      const task = await prisma.$transaction(async (tx) => {
        const newTask = await tx.task.create({
          data: {
            title: title.trim(),
            description,
            priority: priority || 'MEDIUM',
            status: initialStatus,
            dueDate: null,
            createdById,
            workspaceId,
            subtasks: subtasks && Array.isArray(subtasks) && subtasks.length > 0
              ? {
                  create: subtasks.map((st: { title: string; assignedToId?: string; dueDate?: string }) => ({
                    title: st.title.trim(),
                    assignedToId: st.assignedToId || null,
                    dueDate: st.dueDate ? new Date(st.dueDate) : null,
                  })),
                }
              : undefined,
          },
        });

        // Add assignees with PENDING status
        if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: assigneeIds.map((userId: string) => ({
              taskId: newTask.id,
              userId,
              status: userId === createdById ? 'ACCEPTED' : 'PENDING',
              acceptedAt: userId === createdById ? new Date() : null,
            })),
          });

          // Gửi thông báo Web in-app
          for (const uId of assigneeIds) {
            if (uId !== createdById) {
              await tx.notification.create({
                data: {
                  userId: uId,
                  title: '📌 Bạn được giao công việc mới!',
                  content: `${creator?.name || 'Quản lý'} đã giao cho bạn task: "${newTask.title}". Vui lòng bấm để tiếp nhận.`,
                  type: 'TASK',
                  link: `/tasks?id=${newTask.id}`,
                },
              });
            }
          }
        }

        await tx.taskActivity.create({
          data: {
            taskId: newTask.id,
            actorId: createdById,
            type: 'CREATED',
            toStatus: initialStatus,
            note: hasAssignees ? 'Công việc được tạo và phân công' : 'Công việc được đăng lên bảng chờ nhân viên nhận',
          },
        });

        return newTask;
      });

      // Gửi Email thông báo bất đồng bộ
      if (sendEmail !== false && assigneeIds && assigneeIds.length > 0) {
        const targetUsers = workspace?.users.filter((u) => assigneeIds.includes(u.id) && u.id !== createdById) || [];
        const recipientEmails = targetUsers.map((u) => u.email);

        if (recipientEmails.length > 0) {
          EmailService.sendTaskAssignment(workspaceId, recipientEmails, {
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            subtasks: subtasks || [],
            creatorName: creator?.name || 'Quản lý',
            workspaceName: workspace?.name || 'Công Ty',
          }).catch((err) => console.error('[Async Task Email Error]', err));
        }
      }

      // 🤖 Tự động bắn thông báo Telegram lên Nhóm/Kênh công ty (Kèm tag @username nếu có)
      const targetUsers = workspace?.users.filter((u) => assigneeIds && assigneeIds.includes(u.id)) || [];
      const assigneeNames = targetUsers.map((u) => u.name);
      const subtaskTitles = subtasks && Array.isArray(subtasks) ? subtasks.map((s: any) => s.title) : [];

      TelegramService.notifyTaskCreated({
        title: task.title,
        description: task.description,
        priority: task.priority,
        creatorName: creator?.name || 'Quản lý',
        assignees: assigneeNames,
        subtasks: subtaskTitles,
        telegramTag: telegramTag?.trim() || null,
      }).catch((err) => console.error('[Telegram Task Create Error]', err));

      // ⚡ Real-Time WebSocket: Phát sự kiện tạo task mới đến toàn Workspace & chuông thông báo
      SocketService.emitToWorkspace(workspaceId, 'task:created', {
        taskId: task.id,
        title: task.title,
        createdById,
        assigneeIds: assigneeIds || [],
      });
      SocketService.emitToWorkspace(workspaceId, 'notification:new', { type: 'TASK' });

      return res.status(201).json({ message: 'Tạo công việc và gửi thông báo thành công', task });
    } catch (error) {
      console.error('[Create Task Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tạo công việc' });
    }
  }

  // Nhân viên tự ghi tên mình vào một công việc đang mở trên bảng.
  static async claimTask(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { createdBy: true, assignees: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }
      if (task.status !== 'PENDING_ACCEPT' || task.assignees.length > 0) {
        return res.status(409).json({ message: 'Công việc này đã có người nhận' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      await prisma.$transaction(async (tx) => {
        const claimed = await tx.task.updateMany({
          where: {
            id: taskId,
            workspaceId,
            status: 'PENDING_ACCEPT',
            assignees: { none: {} },
          },
          data: { status: 'IN_PROGRESS' },
        });

        if (claimed.count !== 1) {
          throw new Error('TASK_ALREADY_CLAIMED');
        }

        await tx.taskAssignee.create({
          data: {
            taskId,
            userId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        });

        await tx.taskActivity.create({
          data: {
            taskId,
            actorId: userId,
            type: 'CLAIMED',
            fromStatus: 'PENDING_ACCEPT',
            toStatus: 'IN_PROGRESS',
            note: `${currentUser?.name || 'Nhân viên'} đã ghi tên nhận việc`,
          },
        });
      });

      TelegramService.notifyTaskAccepted({
        title: task.title,
        userName: currentUser?.name || 'Nhân viên',
      }).catch((error) => console.error('[Telegram Claim Task Error]', error));

      if (task.createdById !== userId) {
        await prisma.notification.create({
          data: {
            userId: task.createdById,
            title: '✅ Công việc đã có người nhận',
            content: `${currentUser?.name || 'Nhân viên'} đã nhận công việc "${task.title}".`,
            type: 'TASK',
            link: `/tasks?id=${task.id}`,
          },
        }).catch((error) => console.error('[Claim Task Notification Error]', error));
        SocketService.emitToUser(task.createdById, 'notification:new', { type: 'TASK' });
      }

      SocketService.emitToWorkspace(workspaceId, 'task:updated', {
        taskId,
        status: 'IN_PROGRESS',
        action: 'CLAIMED',
        userId,
      });

      return res.json({ message: 'Bạn đã nhận công việc thành công' });
    } catch (error: any) {
      if (error?.message === 'TASK_ALREADY_CLAIMED' || error?.code === 'P2002') {
        return res.status(409).json({ message: 'Công việc vừa được một nhân viên khác nhận' });
      }
      console.error('[Claim Task Error]', error);
      return res.status(500).json({ message: 'Lỗi khi nhận công việc' });
    }
  }

  // 1. Nhân viên bấm TIẾP NHẬN CÔNG VIỆC được quản lý phân công trước đó.
  static async acceptTask(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: {
          createdBy: true,
          assignees: { include: { user: true } },
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const assignment = task.assignees.find((item) => item.userId === userId);
      if (!assignment) {
        return res.status(403).json({ message: 'Công việc này chưa được phân công cho bạn' });
      }
      if (assignment.status === 'ACCEPTED') {
        return res.status(400).json({ message: 'Bạn đã nhận công việc này rồi' });
      }
      if (['REVIEW', 'DONE', 'FAILED'].includes(task.status)) {
        return res.status(400).json({ message: 'Công việc không còn ở trạng thái có thể tiếp nhận' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      // Cập nhật trạng thái người nhận -> ACCEPTED
      await prisma.$transaction(async (tx) => {
        await tx.taskAssignee.update({
          where: { taskId_userId: { taskId, userId } },
          data: { status: 'ACCEPTED', acceptedAt: new Date(), declinedReason: null },
        });

        if (task.status === 'PENDING_ACCEPT') {
          await tx.task.update({ where: { id: taskId }, data: { status: 'IN_PROGRESS' } });
        }

        await tx.taskActivity.create({
          data: {
            taskId,
            actorId: userId,
            type: 'ACCEPTED',
            fromStatus: task.status,
            toStatus: 'IN_PROGRESS',
            note: 'Nhân viên đã nhận việc',
          },
        });
      });

      // Gửi thông báo Web cho Người giao việc
      if (task.createdById !== userId) {
        await prisma.notification.create({
          data: {
            userId: task.createdById,
            title: '✅ Nhân viên đã tiếp nhận công việc!',
            content: `${currentUser?.name} đã tiếp nhận công việc "${task.title}" và đang bắt đầu thực hiện.`,
            type: 'TASK',
            link: `/tasks?id=${task.id}`,
          },
        });

        // Gửi email cho người giao việc
        EmailService.sendTaskStatusUpdate(workspaceId, task.createdBy.email, {
          subject: `[Đã Tiếp Nhận] ${task.title}`,
          title: 'Nhân viên đã tiếp nhận công việc',
          message: `Nhân viên <strong>${currentUser?.name}</strong> đã chính thức tiếp nhận công việc và đang tiến hành thực hiện.`,
          taskTitle: task.title,
          workspaceName: 'MadBros',
        }).catch((err) => console.error('[Email Notify Error]', err));
      }

      // 🤖 Bắn thông báo Telegram khi nhân viên tiếp nhận task
      TelegramService.notifyTaskAccepted({
        title: task.title,
        userName: currentUser?.name || 'Nhân viên',
      }).catch((err) => console.error('[Telegram Accept Notify Error]', err));

      // ⚡ Real-Time WebSocket: Thông báo trạng thái task đã đổi sang IN_PROGRESS
      SocketService.emitToWorkspace(workspaceId, 'task:updated', {
        taskId,
        status: 'IN_PROGRESS',
        action: 'ACCEPTED',
        userId,
      });
      SocketService.emitToUser(task.createdById, 'notification:new', { type: 'TASK' });

      return res.json({ message: 'Bạn đã tiếp nhận công việc thành công! Hãy bắt đầu thực hiện các việc con.' });
    } catch (error) {
      console.error('[Accept Task Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tiếp nhận công việc' });
    }
  }

  // 2. Nhân viên TỪ CHỐI CÔNG VIỆC (Decline Task)
  static async declineTask(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const { reason } = req.body;

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { createdBy: true, assignees: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const assignment = task.assignees.find((item) => item.userId === userId);
      if (!assignment || assignment.status !== 'PENDING') {
        return res.status(403).json({ message: 'Bạn không có công việc đang chờ nhận để từ chối' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      await prisma.taskAssignee.updateMany({
        where: { taskId, userId },
        data: {
          status: 'DECLINED',
          declinedReason: reason || 'Bận việc khác / Không thể nhận task lúc này',
        },
      });

      await prisma.taskActivity.create({
        data: {
          taskId,
          actorId: userId,
          type: 'DECLINED',
          fromStatus: task.status,
          toStatus: task.status,
          note: reason || 'Không thể nhận công việc lúc này',
        },
      });

      // Thông báo cho Người giao việc
      await prisma.notification.create({
        data: {
          userId: task.createdById,
          title: '⚠️ Nhân viên từ chối tiếp nhận task',
          content: `${currentUser?.name} đã từ chối công việc "${task.title}". Lý do: ${reason || 'Không nêu lý do'}`,
          type: 'TASK',
          link: `/tasks?id=${task.id}`,
        },
      }).catch((error) => console.error('[Decline Task Notification Error]', error));

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'task:updated', {
        taskId,
        action: 'DECLINED',
        userId,
      });
      SocketService.emitToUser(task.createdById, 'notification:new', { type: 'TASK' });

      return res.json({ message: 'Đã gửi phản hồi từ chối tới người giao việc' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi từ chối công việc' });
    }
  }

  static async updateTaskStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const status = String(req.body.status || '').toUpperCase();

      if (!['PENDING_ACCEPT', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
      }
      if (status === 'DONE') {
        return res.status(400).json({ message: 'Hãy dùng thao tác Hoàn thành để xác nhận kết quả' });
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { assignees: true },
      });
      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const isManager = ['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role);
      const assignment = task.assignees.find((item) => item.userId === userId && item.status === 'ACCEPTED');
      if (!isManager && !assignment) {
        return res.status(403).json({ message: 'Bạn không phải người đang làm công việc này' });
      }

      if (status === 'IN_PROGRESS' && !task.assignees.some((item) => item.status === 'ACCEPTED')) {
        return res.status(400).json({ message: 'Cần có người nhận việc trước khi chuyển sang Đang làm' });
      }

      await prisma.$transaction(async (tx) => {
        if (status === 'PENDING_ACCEPT') {
          await tx.taskAssignee.deleteMany({ where: { taskId } });
        }
        await tx.task.update({ where: { id: taskId }, data: { status } });
        await tx.taskActivity.create({
          data: {
            taskId,
            actorId: userId,
            type: status === 'PENDING_ACCEPT' ? 'UNASSIGNED' : 'STATUS_UPDATED',
            fromStatus: task.status,
            toStatus: status,
            note: status === 'PENDING_ACCEPT' ? 'Đã trả công việc về bảng chờ nhận' : 'Đã cập nhật trạng thái đang làm',
          },
        });
      });

      SocketService.emitToWorkspace(workspaceId, 'task:updated', {
        taskId,
        status,
        action: status === 'PENDING_ACCEPT' ? 'UNASSIGNED' : 'STATUS_UPDATED',
        userId,
      });

      return res.json({ message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
      console.error('[Update Task Status Error]', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái' });
    }
  }

  // Nhân viên xác nhận hoàn thành. Ghi chú và file/ảnh đều không bắt buộc.
  static async submitForReview(req: AuthenticatedRequest, res: Response) {
    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];
    let submissionSaved = false;
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const completionNote = String(req.body.completionNote || req.body.note || '').trim();
      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { createdBy: true, assignees: true },
      });

      if (!task) {
        removeUploadedFiles(uploadedFiles);
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const assignment = task.assignees.find((item) => item.userId === userId && item.status === 'ACCEPTED');
      if (!assignment && !['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role)) {
        removeUploadedFiles(uploadedFiles);
        return res.status(403).json({ message: 'Bạn chưa nhận hoặc không được phân công công việc này' });
      }
      if (task.status !== 'IN_PROGRESS') {
        removeUploadedFiles(uploadedFiles);
        return res.status(400).json({ message: 'Chỉ có thể nộp kết quả khi công việc đang được thực hiện' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      const { updated, submission } = await prisma.$transaction(async (tx) => {
        const submission = await tx.taskSubmission.create({
          data: {
            taskId,
            submittedById: userId,
            note: completionNote || null,
            reviewStatus: 'APPROVED',
            reviewedById: userId,
            reviewedAt: new Date(),
            attachments: uploadedFiles.length > 0
              ? {
                  create: uploadedFiles.map((file) => ({
                    originalName: file.originalname,
                    storedName: file.filename,
                    mimeType: file.mimetype,
                    size: file.size,
                  })),
                }
              : undefined,
          },
          include: { attachments: true, submittedBy: { select: { id: true, name: true } } },
        });

        const updated = await tx.task.update({
          where: { id: taskId },
          data: { status: 'DONE', completionNote: completionNote || null, reviewFeedback: null },
        });

        await tx.taskActivity.create({
          data: {
            taskId,
            actorId: userId,
            type: 'COMPLETED',
            fromStatus: task.status,
            toStatus: 'DONE',
            note: completionNote || (uploadedFiles.length > 0 ? `Đã hoàn thành và nộp ${uploadedFiles.length} file` : 'Đã xác nhận hoàn thành không kèm ghi chú hoặc file'),
          },
        });

        return { updated, submission };
      });
      submissionSaved = true;

      // Thông báo cho người giao việc
      await prisma.notification.create({
        data: {
          userId: task.createdById,
          title: '✅ Công việc đã hoàn thành',
          content: `${currentUser?.name} đã hoàn thành công việc "${task.title}".`,
          type: 'TASK',
          link: `/tasks?id=${task.id}`,
        },
      }).catch((error) => console.error('[Complete Task Notification Error]', error));

      // Gửi mail cho người giao việc
      EmailService.sendTaskStatusUpdate(workspaceId, task.createdBy.email, {
        subject: `[Hoàn Thành] ${task.title}`,
        title: 'Công việc đã hoàn thành',
        message: `Nhân viên <strong>${currentUser?.name}</strong> đã xác nhận hoàn thành công việc.<br><strong>Ghi chú kết quả:</strong> ${completionNote || 'Không có'}`,
        taskTitle: task.title,
        workspaceName: 'MadBros',
      }).catch((err) => console.error('[Email Notify Error]', err));

      // 🤖 Bắn thông báo Telegram nộp báo cáo nghiệm thu
      const subtasks = await prisma.subtask.findMany({ where: { taskId } });
      const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;

      TelegramService.notifyTaskSubmitted({
        title: task.title,
        userName: currentUser?.name || 'Nhân viên',
        completedSubtasks,
        totalSubtasks: subtasks.length,
        completionReport: completionNote,
      }).catch((err) => console.error('[Telegram Submit Notify Error]', err));

      // ⚡ Real-Time WebSocket: cập nhật trạng thái hoàn thành tức thì
      SocketService.emitToWorkspace(workspaceId, 'task:updated', {
        taskId,
        status: 'DONE',
        action: 'COMPLETED',
        userId,
      });
      SocketService.emitToUser(task.createdById, 'notification:new', { type: 'TASK' });

      return res.json({ message: 'Đã hoàn thành công việc', task: updated, submission });
    } catch (error) {
      if (!submissionSaved) removeUploadedFiles(uploadedFiles);
      console.error('[Submit Task Review Error]', error);
      return res.status(500).json({ message: 'Lỗi khi hoàn thành công việc' });
    }
  }

  // 4. Quản lý / Người giao việc DUYỆT HOẶC YÊU CẦU LÀM LẠI (Review Task)
  static async reviewTask(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const action = String(req.body.action || '').toUpperCase();
      const feedback = String(req.body.feedback || '').trim();

      if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'FAIL'].includes(action)) {
        return res.status(400).json({ message: 'Hành động duyệt không hợp lệ' });
      }
      if (['REJECT', 'REQUEST_CHANGES', 'FAIL'].includes(action) && !feedback) {
        return res.status(400).json({ message: 'Vui lòng nhập lý do hoặc nhận xét' });
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: {
          assignees: { include: { user: true } },
          submissions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const isCreatorOrAdmin = task.createdById === userId || ['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role);
      if (!isCreatorOrAdmin) {
        return res.status(403).json({ message: 'Chỉ Người giao việc, Thư Ký hoặc Admin mới có quyền duyệt task này' });
      }
      if (task.status !== 'REVIEW') {
        return res.status(400).json({ message: 'Công việc chưa được gửi nghiệm thu' });
      }

      const isApprove = action === 'APPROVE';
      const isFail = action === 'FAIL';
      const newStatus = isApprove ? 'DONE' : isFail ? 'FAILED' : 'IN_PROGRESS';
      const activityType = isApprove ? 'APPROVED' : isFail ? 'FAILED' : 'CHANGES_REQUESTED';

      const updated = await prisma.$transaction(async (tx) => {
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: { status: newStatus, reviewFeedback: feedback || null },
        });

        const latestSubmission = task.submissions[0];
        if (latestSubmission) {
          await tx.taskSubmission.update({
            where: { id: latestSubmission.id },
            data: {
              reviewStatus: isApprove ? 'APPROVED' : isFail ? 'FAILED' : 'CHANGES_REQUESTED',
              feedback: feedback || null,
              reviewedById: userId,
              reviewedAt: new Date(),
            },
          });
        }

        await tx.taskActivity.create({
          data: {
            taskId,
            actorId: userId,
            type: activityType,
            fromStatus: task.status,
            toStatus: newStatus,
            note: feedback || (isApprove ? 'Đã duyệt hoàn thành' : null),
          },
        });

        return updatedTask;
      });

      // Thông báo cho các nhân viên phụ trách
      for (const a of task.assignees) {
        await prisma.notification.create({
          data: {
            userId: a.userId,
            title: isApprove ? '🎉 Công việc của bạn đã được DUYỆT!' : isFail ? '❌ Công việc được đánh dấu THẤT BẠI' : '🔄 Công việc cần CHỈNH SỬA / LÀM LẠI',
            content: isApprove
              ? `Chúc mừng! Task "${task.title}" đã được nghiệm thu hoàn thành.`
              : isFail
              ? `Task "${task.title}" không đạt yêu cầu. Lý do: ${feedback}`
              : `Task "${task.title}" cần chỉnh sửa. Nhận xét: ${feedback}`,
            type: 'TASK',
            link: `/tasks?id=${task.id}`,
          },
        });

        // Gửi mail cho nhân viên
        EmailService.sendTaskStatusUpdate(workspaceId, a.user.email, {
          subject: isApprove ? `[Đã Duyệt] ${task.title}` : isFail ? `[Không Đạt] ${task.title}` : `[Yêu Cầu Sửa Đổi] ${task.title}`,
          title: isApprove ? '🎉 Công việc đã được nghiệm thu hoàn thành!' : isFail ? '❌ Công việc không đạt yêu cầu' : '🔄 Yêu cầu chỉnh sửa công việc',
          message: isApprove
            ? `Công việc của bạn đã được kiểm tra và nghiệm thu đạt yêu cầu.`
            : isFail
            ? `Công việc được đánh giá không đạt.<br><strong>Lý do:</strong> ${feedback}`
            : `Quản lý đã yêu cầu chỉnh sửa lại công việc.<br><strong>Nhận xét:</strong> ${feedback}`,
          taskTitle: task.title,
          workspaceName: 'MadBros',
        }).catch((err) => console.error('[Email Notify Error]', err));

        // ⚡ Gửi chuông thông báo Real-time cho từng nhân sự
        SocketService.emitToUser(a.userId, 'notification:new', { type: 'TASK' });
      }

      // 🤖 Bắn thông báo Telegram khi Sếp duyệt hoặc yêu cầu sửa đổi
      const reviewerUser = await prisma.user.findUnique({ where: { id: userId } });
      const assigneeNames = task.assignees.map((a) => a.user.name);

      TelegramService.notifyTaskReviewed({
        title: task.title,
        reviewerName: reviewerUser?.name || 'Quản lý',
        assigneeNames,
        action: isApprove ? 'APPROVE' : 'REJECT',
        feedback,
      }).catch((err) => console.error('[Telegram Review Notify Error]', err));

      // ⚡ Real-Time WebSocket: Cập nhật trạng thái DONE / IN_PROGRESS tức thì
      SocketService.emitToWorkspace(workspaceId, 'task:updated', {
        taskId,
        status: newStatus,
        action: activityType,
        reviewFeedback: feedback,
      });

      return res.json({
        message: isApprove ? 'Đã duyệt hoàn thành công việc!' : isFail ? 'Đã đánh dấu công việc thất bại' : 'Đã gửi yêu cầu chỉnh sửa cho nhân viên',
        task: updated,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi đánh giá công việc' });
    }
  }

  // Cập nhật công việc cha
  static async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role)) {
        return res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa công việc' });
      }
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;
      const { title, description, priority, status, assigneeIds } = req.body;

      if (Array.isArray(assigneeIds) && assigneeIds.length > 1) {
        return res.status(400).json({ message: 'Mỗi công việc chỉ có một người làm chính' });
      }

      const existingTask = await prisma.task.findFirst({
        where: { id, workspaceId },
      });

      if (!existingTask) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }
      if (status !== undefined && !['PENDING_ACCEPT', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái công việc không hợp lệ' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id },
          data: {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? description : undefined,
            priority: priority !== undefined ? priority : undefined,
            status: status !== undefined ? status : undefined,
            dueDate: null,
          },
        });

        if (assigneeIds && Array.isArray(assigneeIds)) {
          await tx.taskAssignee.deleteMany({ where: { taskId: id } });
          if (assigneeIds.length > 0) {
            await tx.taskAssignee.createMany({
              data: assigneeIds.map((userId: string) => ({
                taskId: id,
                userId,
                status: 'PENDING',
              })),
            });
          }
          await tx.task.update({
            where: { id },
            data: { status: 'PENDING_ACCEPT' },
          });
        }

        await tx.taskActivity.create({
          data: {
            taskId: id,
            actorId: req.user!.userId,
            type: 'EDITED',
            fromStatus: existingTask.status,
            toStatus: assigneeIds && Array.isArray(assigneeIds) ? 'PENDING_ACCEPT' : status !== undefined ? status : existingTask.status,
            note: 'Thông tin công việc đã được cập nhật',
          },
        });
      });

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'task:updated', { taskId: id, action: 'EDITED' });

      return res.json({ message: 'Cập nhật công việc thành công' });
    } catch (error) {
      console.error('[Update Task Error]', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật công việc' });
    }
  }

  // Xóa công việc cha
  static async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role)) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa công việc' });
      }
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;

      const task = await prisma.task.findFirst({
        where: { id, workspaceId },
        include: { submissions: { include: { attachments: true } } },
      });
      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      await prisma.task.delete({ where: { id } });
      for (const attachment of task.submissions.flatMap((submission) => submission.attachments)) {
        fs.promises.unlink(path.join(TASK_UPLOAD_DIR, attachment.storedName)).catch(() => undefined);
      }

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'task:deleted', { taskId: id });

      return res.json({ message: 'Đã xóa công việc thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa công việc' });
    }
  }

  // Thêm công việc con (Subtask) vào công việc cha
  static async addSubtask(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.taskId);
      const workspaceId = req.user!.workspaceId;
      const { title, assignedToId, dueDate } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Tên việc con không được để trống' });
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { assignees: { select: { userId: true, status: true } } },
      });
      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc cha' });
      }
      const canWorkOnTask = ['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role)
        || task.assignees.some((item) => item.userId === req.user!.userId && item.status === 'ACCEPTED');
      if (!canWorkOnTask) {
        return res.status(403).json({ message: 'Bạn chưa nhận hoặc không được phân công công việc này' });
      }

      const subtask = await prisma.subtask.create({
        data: {
          taskId,
          title: title.trim(),
          assignedToId: assignedToId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(workspaceId, 'task:updated', { taskId, action: 'SUBTASK_ADDED', subtask });

      return res.status(201).json({ message: 'Đã thêm việc con', subtask });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi thêm việc con' });
    }
  }

  // Toggle trạng thái hoàn thành của công việc con
  static async toggleSubtask(req: AuthenticatedRequest, res: Response) {
    try {
      const subtaskId = String(req.params.subtaskId);
      const { isCompleted } = req.body;

      const subtask = await prisma.subtask.findUnique({
        where: { id: subtaskId },
        include: { task: { include: { assignees: { select: { userId: true, status: true } } } } },
      });

      if (!subtask || subtask.task.workspaceId !== req.user!.workspaceId) {
        return res.status(404).json({ message: 'Không tìm thấy việc con' });
      }
      const canWorkOnTask = ['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role)
        || subtask.task.assignees.some((item) => item.userId === req.user!.userId && item.status === 'ACCEPTED');
      if (!canWorkOnTask) {
        return res.status(403).json({ message: 'Bạn không có quyền cập nhật việc con này' });
      }

      const updatedSubtask = await prisma.subtask.update({
        where: { id: subtaskId },
        data: { isCompleted: isCompleted ?? !subtask.isCompleted },
      });

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(subtask.task.workspaceId, 'task:updated', {
        taskId: subtask.taskId,
        action: 'SUBTASK_TOGGLED',
        subtaskId,
        isCompleted: updatedSubtask.isCompleted,
      });

      return res.json({ message: 'Cập nhật việc con thành công', subtask: updatedSubtask });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi cập nhật việc con' });
    }
  }

  // Xóa công việc con
  static async deleteSubtask(req: AuthenticatedRequest, res: Response) {
    try {
      const subtaskId = String(req.params.subtaskId);
      const subtask = await prisma.subtask.findUnique({
        where: { id: subtaskId },
        include: { task: { include: { assignees: { select: { userId: true, status: true } } } } },
      });

      if (!subtask || subtask.task.workspaceId !== req.user!.workspaceId) {
        return res.status(404).json({ message: 'Không tìm thấy việc con' });
      }
      const canWorkOnTask = ['ADMIN', 'MANAGER', 'SECRETARY'].includes(req.user!.role)
        || subtask.task.assignees.some((item) => item.userId === req.user!.userId && item.status === 'ACCEPTED');
      if (!canWorkOnTask) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa việc con này' });
      }

      await prisma.subtask.delete({ where: { id: subtaskId } });

      // ⚡ Real-Time WebSocket
      SocketService.emitToWorkspace(subtask.task.workspaceId, 'task:updated', {
        taskId: subtask.taskId,
        action: 'SUBTASK_DELETED',
        subtaskId,
      });

      return res.json({ message: 'Đã xóa việc con thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa việc con' });
    }
  }
}
