import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Filter,
  Trash2,
  Calendar,
  PieChart as PieIcon,
  BarChart3,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface TransactionItem {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

const CATEGORY_PRESETS = [
  'Doanh thu Hợp đồng',
  'Dịch vụ Bảo trì',
  'Lương & Thưởng',
  'Thuê văn phòng',
  'Thiết bị & Công nghệ',
  'Marketing & Quảng cáo',
  'Ăn uống & Tiếp khách',
  'Điện nước & Internet',
  'Khác',
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const FinancePage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));

  useEffect(() => {
    fetchData();
  }, [filterType, filterCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let url = '/finance';
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const [txRes, sumRes] = await Promise.all([
        api.get(url),
        api.get('/finance/summary'),
      ]);

      setTransactions(txRes.data);
      setSummary(sumRes.data);
    } catch (error) {
      console.error('Lỗi tải dữ liệu tài chính', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(finalAmount) || finalAmount <= 0) return;

    const finalCategory = category === 'Khác' && customCategory.trim() ? customCategory.trim() : category;

    try {
      await api.post('/finance', {
        type,
        amount: finalAmount,
        category: finalCategory,
        description,
        date: new Date(date).toISOString(),
      });

      // Reset
      setAmount('');
      setDescription('');
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Lỗi tạo giao dịch', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    try {
      await api.delete(`/finance/${id}`);
      fetchData();
    } catch (error) {
      console.error('Lỗi xóa giao dịch', error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm) return true;
    return (
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quản Lý Dòng Tiền Doanh Nghiệp
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Theo dõi phiếu Thu / Chi, dòng tiền thuần và báo cáo cơ cấu chi phí trực quan
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tạo Phiếu Thu / Chi
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Tổng Thu Nhập"
          value={formatCurrency(summary?.totalIncome)}
          subtitle="Doanh thu từ các dự án & hợp đồng"
          icon={<TrendingUp className="w-6 h-6" />}
          color="emerald"
        />

        <StatCard
          title="Tổng Chi Phí"
          value={formatCurrency(summary?.totalExpense)}
          subtitle="Lương, văn phòng & vận hành"
          icon={<TrendingDown className="w-6 h-6" />}
          color="rose"
        />

        <StatCard
          title="Số Dư Dòng Tiền (Cash Balance)"
          value={formatCurrency(summary?.balance)}
          subtitle={summary?.balance >= 0 ? 'Dòng tiền đang dương an toàn' : 'Cảnh báo dòng tiền âm'}
          icon={<DollarSign className="w-6 h-6" />}
          trendPositive={summary?.balance >= 0}
          trend={summary?.balance >= 0 ? 'Dương tiền' : 'Âm tiền'}
          color={summary?.balance >= 0 ? 'blue' : 'rose'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Monthly Comparison */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Biến Động Thu - Chi Theo Tháng</h3>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-4">
            {summary?.monthlyData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.monthlyData}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => `${val / 1000000}M`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Thu Nhập" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Chi Phí" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                Chưa có dữ liệu thống kê tháng
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Expense Breakdown */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <PieIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Cơ Cấu Chi Phí</h3>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            {summary?.categoryBreakdown?.filter((c: any) => c.expense > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.categoryBreakdown.filter((c: any) => c.expense > 0)}
                    dataKey="expense"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {summary.categoryBreakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 text-center">Chưa có số liệu chi phí</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Transactions Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white self-start">Sổ Nhật Ký Thu / Chi</h3>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm danh mục, nội dung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="INCOME">Chỉ Khoản Thu (+)</option>
              <option value="EXPENSE">Chỉ Khoản Chi (-)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Loại</th>
                <th className="py-3 px-4">Số Tiền</th>
                <th className="py-3 px-4">Danh Mục</th>
                <th className="py-3 px-4">Ghi Chú / Nội Dung</th>
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4">Người Nhập</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold">
                    {t.type === 'INCOME' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        + THU
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        - CHI
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono font-extrabold text-sm ${
                      t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{t.category}</td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{t.description || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(t.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{t.createdBy?.name}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDeleteTransaction(t.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Xóa phiếu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Không có giao dịch nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Giao Dịch Thu / Chi Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo Phiếu Thu / Chi Mới"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          {/* Toggle Income / Expense */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2.5 text-xs font-bold rounded-lg transition ${
                type === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              + Khoản Thu (Income)
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2.5 text-xs font-bold rounded-lg transition ${
                type === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              - Khoản Chi (Expense)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Số Tiền (VND) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              required
              min="1000"
              step="1000"
              placeholder="VD: 50000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            {amount && !isNaN(Number(amount)) && (
              <p className="text-xs text-emerald-400 font-medium mt-1">
                = {formatCurrency(Number(amount))}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Danh Mục Thu / Chi
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ngày Phát Sinh
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {category === 'Khác' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nhập Tên Danh Mục Khác
              </label>
              <input
                type="text"
                placeholder="VD: Phí đăng kiểm xe công ty..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ghi Chú / Nội Dung Giao Dịch
            </label>
            <textarea
              rows={3}
              placeholder="Thông tin khách hàng, số hợp đồng, lý do chi tiêu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg transition ${
                type === 'INCOME'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              Lưu Phiếu {type === 'INCOME' ? 'Thu' : 'Chi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
