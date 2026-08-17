import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { useTheme } from '../context/ThemeContext';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
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
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterCategory, pageSize]);

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
    if (!amount || Number(amount) <= 0) return;

    try {
      const finalCategory = category === 'Khác' && customCategory.trim() ? customCategory.trim() : category;

      await api.post('/finance', {
        type,
        amount: Number(amount),
        category: finalCategory,
        description,
        date: new Date(date).toISOString(),
      });

      // Reset
      setAmount('');
      setDescription('');
      setCustomCategory('');
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
    const matchesSearch =
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Sổ Quỹ Thu Chi & Dòng Tiền
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {totalItems} Giao Dịch
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Theo dõi doanh thu, chi phí vận hành và phân bổ tài chính doanh nghiệp theo thời gian thực
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tạo Phiếu Thu / Chi
        </button>
      </div>

      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Tổng Thu Nhập"
          value={formatCurrency(summary?.totalIncome)}
          subtitle="Doanh thu lũy kế đã ghi nhận"
          icon={<TrendingUp className="w-6 h-6" />}
          trendPositive={true}
          trend="+ Doanh thu vào"
          color="emerald"
        />

        <StatCard
          title="Tổng Chi Phí"
          value={formatCurrency(summary?.totalExpense)}
          subtitle="Các khoản chi tiêu & vận hành"
          icon={<TrendingDown className="w-6 h-6" />}
          trendPositive={false}
          trend="- Chi phí ra"
          color="rose"
        />

        <StatCard
          title="Số Dư Quỹ Hiện Tại"
          value={formatCurrency(summary?.balance)}
          subtitle={summary?.balance >= 0 ? 'Dòng tiền dương khỏe mạnh' : 'Cảnh báo thâm hụt ngân sách'}
          icon={<DollarSign className="w-6 h-6" />}
          trendPositive={summary?.balance >= 0}
          trend={summary?.balance >= 0 ? '+ Dương quỹ' : '- Âm quỹ'}
          color={summary?.balance >= 0 ? 'blue' : 'rose'}
        />
      </div>

      {/* Charts Section: 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Monthly Income vs Expense BarChart (7 Cols) */}
        <div className={`xl:col-span-7 rounded-3xl border p-6 sm:p-7 space-y-4 shadow-xl ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-3 pb-2">
            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/20'}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Biểu Đồ Thu / Chi Theo Tháng</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>So sánh doanh thu và chi phí 6 tháng gần nhất</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.monthlyStats || []}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}Tr`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#ffffff' : '#0f172a',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: isLight ? '#0f172a' : '#ffffff',
                  }}
                  formatter={(val: any) => [formatCurrency(val), '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Chi phí" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense by Category PieChart (5 Cols) */}
        <div className={`xl:col-span-5 rounded-3xl border p-6 sm:p-7 space-y-4 shadow-xl ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
        }`}>
          <div className="flex items-center gap-3 pb-2">
            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/15 text-purple-400 border-purple-500/20'}`}>
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Phân Bổ Chi Phí Theo Danh Mục</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tỷ trọng các nhóm chi tiêu trong tháng</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {summary?.categoryExpense?.length === 0 ? (
              <div className={`h-full flex items-center justify-center text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                Chưa có dữ liệu chi tiêu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary?.categoryExpense || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {summary?.categoryExpense?.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? '#ffffff' : '#0f172a',
                      border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: isLight ? '#0f172a' : '#ffffff',
                    }}
                    formatter={(val: any) => [formatCurrency(val), 'Số tiền']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Transaction List Table with Search & Filters */}
      <div className={`p-6 sm:p-7 rounded-3xl border space-y-5 shadow-xl ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Lịch Sử Giao Dịch Thu / Chi</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Chi tiết tất cả phiếu thu và phiếu chi đã lập</p>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm nội dung..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
                }`}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <option value="ALL">Mọi loại phiếu</option>
              <option value="INCOME">Chỉ xem Khoản Thu (+)</option>
              <option value="EXPENSE">Chỉ xem Khoản Chi (-)</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <option value="ALL">Mọi danh mục</option>
              {CATEGORY_PRESETS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'
            }`}>
              <tr>
                <th className="py-3.5 px-4">Loại Phiếu</th>
                <th className="py-3.5 px-4">Số Tiền</th>
                <th className="py-3.5 px-4">Danh Mục</th>
                <th className="py-3.5 px-4">Nội Dung / Diễn Giải</th>
                <th className="py-3.5 px-4">Ngày Giao Dịch</th>
                <th className="py-3.5 px-4">Người Lập</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/80 text-slate-300'}`}>
              {paginatedTransactions.map((t) => (
                <tr key={t.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}`}>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        t.type === 'INCOME'
                          ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isLight ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {t.type === 'INCOME' ? 'THU (+)' : 'CHI (-)'}
                    </span>
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono font-extrabold text-sm ${
                      t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {t.type === 'INCOME' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className={`py-3.5 px-4 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{t.category}</td>
                  <td className={`py-3.5 px-4 max-w-xs truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t.description || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(t.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{t.createdBy?.name}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleDeleteTransaction(t.id)}
                      className={`p-1.5 rounded-xl transition cursor-pointer ${
                        isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                      }`}
                      title="Xóa phiếu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không có giao dịch nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > pageSize && (
          <div className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
          }`}>
            <div>
              Hiển thị <strong className={isLight ? 'text-slate-900' : 'text-white'}>{startIndex + 1}</strong> - <strong className={isLight ? 'text-slate-900' : 'text-white'}>{endIndex}</strong> trên tổng số <strong className="text-emerald-600 dark:text-emerald-400">{totalItems}</strong> phiếu
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer ${
                  isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>

              <span className={`px-2 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer ${
                  isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tạo Giao Dịch Thu / Chi Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo Phiếu Thu / Chi Mới"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          {/* Toggle Income / Expense */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2.5 text-xs font-bold rounded-xl transition ${
                type === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              + Khoản Thu (Income)
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2.5 text-xs font-bold rounded-xl transition ${
                type === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
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
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition"
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
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none transition"
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
              className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
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
