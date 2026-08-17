import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';

export class FinanceController {
  // Lấy danh sách phiếu Thu / Chi
  static async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const { type, category, startDate, endDate, limit = 100 } = req.query;

      const whereClause: any = { workspaceId };
      if (type && ['INCOME', 'EXPENSE'].includes(String(type))) {
        whereClause.type = String(type);
      }
      if (category) {
        whereClause.category = String(category);
      }
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) whereClause.date.gte = new Date(String(startDate));
        if (endDate) whereClause.date.lte = new Date(String(endDate));
      }

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { date: 'desc' },
        take: Number(limit),
      });

      return res.json(transactions);
    } catch (error) {
      console.error('[Get Transactions Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tải danh sách giao dịch' });
    }
  }

  // Tạo phiếu Thu / Chi mới
  static async createTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const createdById = req.user!.userId;
      const { type, amount, category, description, date } = req.body;

      if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
        return res.status(400).json({ message: 'Loại giao dịch phải là INCOME (Thu) hoặc EXPENSE (Chi)' });
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'Số tiền không hợp lệ' });
      }

      if (!category || !category.trim()) {
        return res.status(400).json({ message: 'Vui lòng chọn hoặc nhập danh mục thu chi' });
      }

      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount: numAmount,
          category: category.trim(),
          description,
          date: date ? new Date(date) : new Date(),
          workspaceId,
          createdById,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      return res.status(201).json({ message: 'Tạo phiếu giao dịch thành công', transaction });
    } catch (error) {
      console.error('[Create Transaction Error]', error);
      return res.status(500).json({ message: 'Lỗi khi tạo phiếu giao dịch' });
    }
  }

  // Cập nhật phiếu Thu / Chi (Chỉ Admin hoặc người tạo)
  static async updateTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;
      const { type, amount, category, description, date } = req.body;

      const existing = await prisma.transaction.findFirst({
        where: { id, workspaceId },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
      }

      if (req.user!.role !== 'ADMIN' && existing.createdById !== req.user!.userId) {
        return res.status(403).json({ message: 'Chỉ Quản trị viên hoặc người tạo mới có quyền chỉnh sửa phiếu này' });
      }

      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          type: type && ['INCOME', 'EXPENSE'].includes(type) ? type : undefined,
          amount: amount !== undefined ? Number(amount) : undefined,
          category: category ? category.trim() : undefined,
          description,
          date: date ? new Date(date) : undefined,
        },
      });

      return res.json({ message: 'Cập nhật giao dịch thành công', transaction: updated });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi cập nhật giao dịch' });
    }
  }

  // Xóa phiếu Thu / Chi (Chỉ Admin hoặc người tạo)
  static async deleteTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const workspaceId = req.user!.workspaceId;

      const existing = await prisma.transaction.findFirst({
        where: { id, workspaceId },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
      }

      if (req.user!.role !== 'ADMIN' && existing.createdById !== req.user!.userId) {
        return res.status(403).json({ message: 'Chỉ Quản trị viên hoặc người tạo mới có quyền xóa phiếu này' });
      }

      await prisma.transaction.delete({ where: { id } });
      return res.json({ message: 'Đã xóa giao dịch thành công' });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi khi xóa giao dịch' });
    }
  }

  // Thống kê tổng quan dòng tiền & Biểu đồ phân tích
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const workspaceId = req.user!.workspaceId;
      const allTransactions = await prisma.transaction.findMany({
        where: { workspaceId },
        orderBy: { date: 'asc' },
      });

      let totalIncome = 0;
      let totalExpense = 0;
      const categoryMap: { [key: string]: { income: number; expense: number } } = {};
      const monthlyMap: { [key: string]: { month: string; income: number; expense: number } } = {};

      for (const t of allTransactions) {
        const monthKey = new Date(t.date).toISOString().substring(0, 7);
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
        }

        if (!categoryMap[t.category]) {
          categoryMap[t.category] = { income: 0, expense: 0 };
        }

        if (t.type === 'INCOME') {
          totalIncome += t.amount;
          monthlyMap[monthKey].income += t.amount;
          categoryMap[t.category].income += t.amount;
        } else {
          totalExpense += t.amount;
          monthlyMap[monthKey].expense += t.amount;
          categoryMap[t.category].expense += t.amount;
        }
      }

      const balance = totalIncome - totalExpense;
      const monthlyData = Object.values(monthlyMap);
      const categoryBreakdown = Object.entries(categoryMap).map(([category, values]) => ({
        category,
        income: values.income,
        expense: values.expense,
        total: values.income + values.expense,
      }));

      return res.json({
        totalIncome,
        totalExpense,
        balance,
        monthlyData,
        categoryBreakdown,
        totalTransactions: allTransactions.length,
      });
    } catch (error) {
      console.error('[Get Finance Summary Error]', error);
      return res.status(500).json({ message: 'Lỗi khi lấy thống kê dòng tiền' });
    }
  }
}
