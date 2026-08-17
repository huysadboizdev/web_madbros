import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { EmailService } from '../services/emailService';

export class TaskController {
  // Lấy danh sách công việc của Workspace
  static async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { status, priority, search } = req.query;

      const whereClause: any = { workspaceId };
      if (status) whereClause.status = String(status);
      if (priority) whereClause.priority = String(priority);
      if (search) {
        whereClause.OR = [
          { title: { contains: String(search) } },
          { description: { contains: String(search) } },
        ];
      }

      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: {
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
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Format response with progress percentage & assignee acceptance status
      const formattedTasks = tasks.map((task) => {
        const totalSubtasks = task.subtasks.length;
        const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (task.status === 'DONE' ? 100 : 0);

        return {
          ...task,
          progress,
          totalSubtasks,
          completedSubtasks,
          assignees: task.assignees.map((a) => ({
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            avatar: a.user.avatar,
            acceptanceStatus: a.status,
            acceptedAt: a.acceptedAt,
            declinedReason: a.declinedReason,
          })),
        };
      });

      return res.json(formattedTasks);
    } catch (error) {
      console.error('[Get Tasks Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tải danh sách công việc' });
    }
  }

  // Tạo công việc cha mới & Gửi Email + Thông báo Web cho nhân viên được giao
  static async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const { title, description, priority, dueDate, assigneeIds, subtasks, sendEmail } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Tên công việc không được để trống' });
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { users: true },
      });

      const creator = workspace?.users.find((u) => u.id === createdById);

      // Nếu có assignees và không phải tự giao cho mình -> Ban đầu trạng thái là PENDING_ACCEPT
      const hasOtherAssignees = assigneeIds && Array.isArray(assigneeIds) && assigneeIds.some((id: string) => id !== createdById);
      const initialStatus = hasOtherAssignees ? 'PENDING_ACCEPT' : 'IN_PROGRESS';

      const task = await prisma.$transaction(async (tx) => {
        const newTask = await tx.task.create({
          data: {
            title: title.trim(),
            description,
            priority: priority || 'MEDIUM',
            status: initialStatus,
            dueDate: dueDate ? new Date(dueDate) : null,
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

      return res.status(201).json({ message: 'Tạo công việc và gửi thông báo thành công', task });
    } catch (error) {
      console.error('[Create Task Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tạo công việc' });
    }
  }

  // 1. Nhân viên bấm TIẾP NHẬN CÔNG VIỆC (Accept Task)
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

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      // Cập nhật trạng thái người nhận -> ACCEPTED
      await prisma.taskAssignee.upsert({
        where: {
          taskId_userId: { taskId, userId },
        },
        update: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          declinedReason: null,
        },
        create: {
          taskId,
          userId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      // Đổi trạng thái task sang IN_PROGRESS nếu đang PENDING_ACCEPT
      if (task.status === 'PENDING_ACCEPT') {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: 'IN_PROGRESS' },
        });
      }

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
        include: { createdBy: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      await prisma.taskAssignee.updateMany({
        where: { taskId, userId },
        data: {
          status: 'DECLINED',
          declinedReason: reason || 'Bận việc khác / Không thể nhận task lúc này',
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
      });

      return res.json({ message: 'Đã gửi phản hồi từ chối tới người giao việc' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi từ chối công việc' });
    }
  }

  // 3. Nhân viên NỘP BÁO CÁO & YÊU CẦU NGHIỆM THU (Submit for Review)
  static async submitForReview(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const { completionNote } = req.body;

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: { createdBy: true },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: userId } });

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'REVIEW',
          completionNote: completionNote || null,
        },
      });

      // Thông báo cho người giao việc
      await prisma.notification.create({
        data: {
          userId: task.createdById,
          title: '📤 Yêu cầu nghiệm thu công việc!',
          content: `${currentUser?.name} đã hoàn thành và gửi duyệt công việc "${task.title}".`,
          type: 'TASK',
          link: `/tasks?id=${task.id}`,
        },
      });

      // Gửi mail cho người giao việc
      EmailService.sendTaskStatusUpdate(workspaceId, task.createdBy.email, {
        subject: `[Chờ Duyệt] ${task.title}`,
        title: 'Yêu cầu nghiệm thu công việc',
        message: `Nhân viên <strong>${currentUser?.name}</strong> đã hoàn thành các đầu việc và gửi yêu cầu nghiệm thu.<br><strong>Ghi chú kết quả:</strong> ${completionNote || 'Không có'}`,
        taskTitle: task.title,
        workspaceName: 'MadBros',
      }).catch((err) => console.error('[Email Notify Error]', err));

      return res.json({ message: 'Đã gửi yêu cầu nghiệm thu thành công', task: updated });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi gửi duyệt công việc' });
    }
  }

  // 4. Quản lý / Người giao việc DUYỆT HOẶC YÊU CẦU LÀM LẠI (Review Task)
  static async reviewTask(req: AuthenticatedRequest, res: Response) {
    try {
      const taskId = String(req.params.id);
      const userId = req.user!.userId;
      const workspaceId = req.user!.workspaceId;
      const { action, feedback } = req.body; // action: 'APPROVE' hoặc 'REJECT'

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        include: {
          assignees: { include: { user: true } },
        },
      });

      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      const isCreatorOrAdmin = task.createdById === userId || req.user!.role === 'ADMIN';
      if (!isCreatorOrAdmin) {
        return res.status(403).json({ message: 'Chỉ Người giao việc hoặc Admin mới có quyền duyệt task này' });
      }

      const isApprove = action === 'APPROVE';
      const newStatus = isApprove ? 'DONE' : 'IN_PROGRESS';

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          reviewFeedback: feedback || null,
        },
      });

      // Thông báo cho các nhân viên phụ trách
      for (const a of task.assignees) {
        await prisma.notification.create({
          data: {
            userId: a.userId,
            title: isApprove ? '🎉 Công việc của bạn đã được DUYỆT!' : '🔄 Công việc cần CHỈNH SỬA / LÀM LẠI',
            content: isApprove
              ? `Chúc mừng! Task "${task.title}" đã được nghiệm thu hoàn thành.`
              : `Task "${task.title}" cần chỉnh sửa. Nhận xét: ${feedback || 'Vui lòng kiểm tra lại yêu cầu'}`,
            type: 'TASK',
            link: `/tasks?id=${task.id}`,
          },
        });

        // Gửi mail cho nhân viên
        EmailService.sendTaskStatusUpdate(workspaceId, a.user.email, {
          subject: isApprove ? `[Đã Duyệt] ${task.title}` : `[Yêu Cầu Sửa Đổi] ${task.title}`,
          title: isApprove ? '🎉 Công việc đã được nghiệm thu hoàn thành!' : '🔄 Yêu cầu chỉnh sửa công việc',
          message: isApprove
            ? `Công việc của bạn đã được kiểm tra và nghiệm thu đạt yêu cầu.`
            : `Quản lý đã yêu cầu chỉnh sửa lại công việc.<br><strong>Nhận xét:</strong> ${feedback || 'Vui lòng hoàn thiện lại các đầu việc chưa đạt.'}`,
          taskTitle: task.title,
          workspaceName: 'MadBros',
        }).catch((err) => console.error('[Email Notify Error]', err));
      }

      return res.json({
        message: isApprove ? 'Đã duyệt hoàn thành công việc!' : 'Đã gửi yêu cầu chỉnh sửa cho nhân viên',
        task: updated,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi đánh giá công việc' });
    }
  }

  // Cập nhật công việc cha
  static async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;
      const { title, description, priority, status, dueDate, assigneeIds } = req.body;

      const existingTask = await prisma.task.findFirst({
        where: { id, workspaceId },
      });

      if (!existingTask) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id },
          data: {
            title: title !== undefined ? title.trim() : undefined,
            description: description !== undefined ? description : undefined,
            priority: priority !== undefined ? priority : undefined,
            status: status !== undefined ? status : undefined,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
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
        }
      });

      return res.json({ message: 'Cập nhật công việc thành công' });
    } catch (error) {
      console.error('[Update Task Error]', error);
      return res.status(500).json({ message: 'Lỗi khi cập nhật công việc' });
    }
  }

  // Xóa công việc cha
  static async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;

      const task = await prisma.task.findFirst({ where: { id, workspaceId } });
      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc' });
      }

      await prisma.task.delete({ where: { id } });
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

      const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId } });
      if (!task) {
        return res.status(404).json({ message: 'Không tìm thấy công việc cha' });
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
        include: { task: true },
      });

      if (!subtask || subtask.task.workspaceId !== req.user!.workspaceId) {
        return res.status(404).json({ message: 'Không tìm thấy việc con' });
      }

      const updatedSubtask = await prisma.subtask.update({
        where: { id: subtaskId },
        data: { isCompleted: isCompleted ?? !subtask.isCompleted },
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
        include: { task: true },
      });

      if (!subtask || subtask.task.workspaceId !== req.user!.workspaceId) {
        return res.status(404).json({ message: 'Không tìm thấy việc con' });
      }

      await prisma.subtask.delete({ where: { id: subtaskId } });
      return res.json({ message: 'Đã xóa việc con thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa việc con' });
    }
  }
}
