import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

export class StatsController {
  static async getDashboardOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Tasks stats
      const [totalTasks, doneTasks, inProgressTasks, todoTasks] = await Promise.all([
        prisma.task.count({ where: { workspaceId } }),
        prisma.task.count({ where: { workspaceId, status: 'DONE' } }),
        prisma.task.count({ where: { workspaceId, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { workspaceId, status: 'TODO' } }),
      ]);

      // Today's and Upcoming Meetings
      const todayMeetings = await prisma.meeting.findMany({
        where: {
          workspaceId,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          createdBy: { select: { name: true } },
          participants: { include: { user: { select: { name: true, avatar: true } } } },
        },
        orderBy: { startTime: 'asc' },
      });

      const upcomingMeetingsCount = await prisma.meeting.count({
        where: {
          workspaceId,
          startTime: { gte: now },
        },
      });

      // Finance stats
      const transactions = await prisma.transaction.findMany({
        where: { workspaceId },
      });

      let totalIncome = 0;
      let totalExpense = 0;
      for (const t of transactions) {
        if (t.type === 'INCOME') totalIncome += t.amount;
        else totalExpense += t.amount;
      }
      const balance = totalIncome - totalExpense;

      // Recent 5 Tasks
      const recentTasks = await prisma.task.findMany({
        where: { workspaceId },
        include: {
          subtasks: true,
          assignees: { include: { user: { select: { name: true, avatar: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const formattedRecentTasks = recentTasks.map((t) => {
        const total = t.subtasks.length;
        const completed = t.subtasks.filter((s) => s.isCompleted).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : (t.status === 'DONE' ? 100 : 0);
        return {
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          progress,
          dueDate: t.dueDate,
          assignees: t.assignees.map((a) => a.user),
        };
      });

      // Members count
      const totalMembers = await prisma.user.count({ where: { workspaceId } });

      return res.json({
        tasks: {
          total: totalTasks,
          done: doneTasks,
          inProgress: inProgressTasks,
          todo: todoTasks,
          recent: formattedRecentTasks,
        },
        meetings: {
          today: todayMeetings,
          todayCount: todayMeetings.length,
          upcomingCount: upcomingMeetingsCount,
        },
        finance: {
          totalIncome,
          totalExpense,
          balance,
        },
        totalMembers,
      });
    } catch (error) {
      console.error('[Dashboard Overview Error]', error);
      return res.status(500).json({ message: 'Lỗi tải thông tin tổng quan' });
    }
  }
}
