import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { useTheme } from '../context/ThemeContext';
import {
  Package,
  Plus,
  Search,
  Laptop,
  Trash2,
  Edit,
  UserCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  MapPin,
  FileText,
  User as UserIcon,
} from 'lucide-react';

interface Asset {
  id: string;
  code: string;
  name: string;
  category: string;
  value: number;
  status: 'IN_USE' | 'AVAILABLE' | 'MAINTENANCE' | 'BROKEN' | 'LIQUIDATED';
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email: string; role: string } | null;
  assignedDate?: string | null;
  location?: string | null;
  note?: string | null;
  createdAt: string;
}

const ASSET_CATEGORIES = [
  'Thiết bị IT (Laptop, PC, Màn hình)',
  'Điện thoại & Tablet',
  'Thiết bị Văn phòng (Máy in, Scan)',
  'Nội thất (Bàn, Ghế công thái học)',
  'Phương tiện đi lại',
  'Bản quyền phần mềm & Server',
  'Tài sản khác',
];

export const AdminAssetsPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(ASSET_CATEGORIES[0]);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'IN_USE' | 'AVAILABLE' | 'MAINTENANCE' | 'BROKEN' | 'LIQUIDATED'>('AVAILABLE');
  const [assignedToId, setAssignedToId] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    fetchAssets();
    fetchMembers();
  }, [filterCategory, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, pageSize]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      let url = '/admin/assets';
      const params = new URLSearchParams();
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      setAssets(res.data);
    } catch (error) {
      console.error('Lỗi tải tài sản', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/admin/users');
      setMembers(res.data);
    } catch (error) {
      console.error('Lỗi tải thành viên', error);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await api.post('/admin/assets', {
        code: code.trim(),
        name: name.trim(),
        category,
        value: Number(value) || 0,
        status: assignedToId ? 'IN_USE' : status,
        assignedToId: assignedToId || null,
        location: location.trim() || null,
        note: note.trim() || null,
      });

      setMessage({ text: res.data.message, success: true });
      setShowCreateModal(false);
      resetForm();
      fetchAssets();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi thêm tài sản');
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !name.trim()) return;

    try {
      const res = await api.patch(`/admin/assets/${selectedAsset.id}`, {
        code: code.trim(),
        name: name.trim(),
        category,
        value: Number(value) || 0,
        status: assignedToId && status === 'AVAILABLE' ? 'IN_USE' : status,
        assignedToId: assignedToId || null,
        location: location.trim() || null,
        note: note.trim() || null,
      });

      setMessage({ text: res.data.message, success: true });
      setShowEditModal(false);
      setSelectedAsset(null);
      resetForm();
      fetchAssets();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi cập nhật tài sản');
    }
  };

  const handleDeleteAsset = async (id: string, assetName: string) => {
    if (!confirm(`Bạn có chắc muốn thanh lý hoặc xóa tài sản "${assetName}"?`)) return;
    try {
      const res = await api.delete(`/admin/assets/${id}`);
      setMessage({ text: res.data.message, success: true });
      fetchAssets();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi xóa tài sản');
    }
  };

  const openEditModal = (a: Asset) => {
    setSelectedAsset(a);
    setCode(a.code);
    setName(a.name);
    setCategory(a.category);
    setValue(String(a.value || ''));
    setStatus(a.status);
    setAssignedToId(a.assignedToId || '');
    setLocation(a.location || '');
    setNote(a.note || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setCategory(ASSET_CATEGORIES[0]);
    setValue('');
    setStatus('AVAILABLE');
    setAssignedToId('');
    setLocation('');
    setNote('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'IN_USE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Đang Sử Dụng
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Sẵn Sàng Cấp Phát
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Đang Bảo Trì
          </span>
        );
      case 'BROKEN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            Hỏng Hóc
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
            Đã Thanh Lý
          </span>
        );
    }
  };

  // Stats calculation
  const totalAssetsValue = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const inUseCount = assets.filter((a) => a.status === 'IN_USE').length;
  const availableCount = assets.filter((a) => a.status === 'AVAILABLE').length;

  // Filter and pagination
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.assignedTo?.name && a.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const totalItems = filteredAssets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Quản Lý Tài Sản & Thiết Bị Cấp Phát
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              {totalItems} Tài Sản
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Kiểm kê máy tính, thiết bị công nghệ, bàn giao cấp phát cho nhân viên và theo dõi tình trạng bảo trì
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setCode(`TS-${Math.floor(1000 + Math.random() * 9000)}`);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Khai Báo Tài Sản Mới
        </button>
      </div>

      {/* 3 Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Tổng Giá Trị Tài Sản"
          value={formatCurrency(totalAssetsValue)}
          subtitle={`${assets.length} hạng mục trong hệ thống`}
          icon={<DollarSign className="w-6 h-6" />}
          trend="Kiểm kê đầy đủ"
          trendPositive={true}
          color="amber"
        />

        <StatCard
          title="Đang Cấp Phát Cho Nhân Viên"
          value={`${inUseCount} thiết bị`}
          subtitle="Máy tính & đồ dùng đang sử dụng"
          icon={<Laptop className="w-6 h-6" />}
          trend={`${Math.round((inUseCount / (assets.length || 1)) * 100)}% hiệu suất`}
          trendPositive={true}
          color="blue"
        />

        <StatCard
          title="Sẵn Sàng Cấp Phát Trong Kho"
          value={`${availableCount} thiết bị`}
          subtitle="Sẵn sàng cấp cho nhân viên mới"
          icon={<Package className="w-6 h-6" />}
          trend="Trong kho"
          trendPositive={true}
          color="emerald"
        />
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 border ${
            message.success
              ? isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã TS, nhân viên giữ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
          >
            <option value="ALL">Mọi danh mục tài sản</option>
            {ASSET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 transition border ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
          >
            <option value="ALL">Mọi tình trạng</option>
            <option value="IN_USE">Đang sử dụng</option>
            <option value="AVAILABLE">Sẵn sàng cấp phát</option>
            <option value="MAINTENANCE">Đang bảo trì</option>
            <option value="BROKEN">Hỏng hóc</option>
            <option value="LIQUIDATED">Đã thanh lý</option>
          </select>

          <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-lg text-xs focus:outline-none border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <option value={8}>8 mục</option>
              <option value={16}>16 mục</option>
              <option value={32}>32 mục</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
      }`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
            <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'
            }`}>
              <tr>
                <th className="py-3.5 px-4">Mã Tài Sản</th>
                <th className="py-3.5 px-4">Tên Thiết Bị / Tài Sản</th>
                <th className="py-3.5 px-4">Danh Mục</th>
                <th className="py-3.5 px-4">Giá Trị (VND)</th>
                <th className="py-3.5 px-4">Tình Trạng</th>
                <th className="py-3.5 px-4">Người Đang Giữ</th>
                <th className="py-3.5 px-4">Vị Trí / Ghi Chú</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/80 text-slate-300'}`}>
              {paginatedAssets.map((a) => (
                <tr key={a.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}`}>
                  <td className="py-3.5 px-4 font-mono font-extrabold text-amber-600 dark:text-amber-400">{a.code}</td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{a.name}</span>
                      {a.note && <p className={`text-[11px] line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{a.note}</p>}
                    </div>
                  </td>

                  <td className={`py-3.5 px-4 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{a.category}</td>

                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(a.value)}
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(a.status)}</td>

                  <td className="py-3.5 px-4">
                    {a.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                          {a.assignedTo.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{a.assignedTo.name}</p>
                          <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{a.assignedTo.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Chưa cấp phát (Trong kho)</span>
                    )}
                  </td>

                  <td className={`py-3.5 px-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{a.location || 'Trụ sở chính'}</td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(a)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isLight ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                        }`}
                        title="Chỉnh sửa & Bàn giao"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteAsset(a.id, a.name)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Xóa tài sản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy tài sản nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > pageSize && (
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
          }`}>
            <div>
              Hiển thị <strong className={isLight ? 'text-slate-900' : 'text-white'}>{startIndex + 1}</strong> - <strong className={isLight ? 'text-slate-900' : 'text-white'}>{endIndex}</strong> / <strong className="text-amber-600 dark:text-amber-400">{totalItems}</strong> tài sản
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 cursor-pointer ${
                  isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
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
                  isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                }`}
              >
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Khai Báo Tài Sản Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Khai Báo Tài Sản / Thiết Bị Doanh Nghiệp"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mã Tài Sản <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: MAC-001, LAP-002"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên Tài Sản / Thiết Bị <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: MacBook Pro M2 16GB 512GB"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Danh Mục Tài Sản
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Giá Trị Đầu Tư (VND)
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                placeholder="VD: 35000000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bàn Giao Cho Nhân Viên
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">— Chưa bàn giao (Lưu kho) —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tình Trạng Thiết Bị
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="AVAILABLE">Sẵn Sàng Cấp Phát (Kho)</option>
                <option value="IN_USE">Đang Sử Dụng</option>
                <option value="MAINTENANCE">Đang Bảo Trì / Sửa Chữa</option>
                <option value="BROKEN">Hỏng Hóc</option>
                <option value="LIQUIDATED">Đã Thanh Lý</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vị Trí Đặt Thiết Bị
              </label>
              <input
                type="text"
                placeholder="VD: Phòng Kỹ Thuật Tầng 2 / Bàn số 12"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ghi Chú Cấu Hình / Số Serial
              </label>
              <input
                type="text"
                placeholder="VD: S/N: C02XYZ123, sạc 67W kèm theo"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Lưu Tài Sản Mới
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chỉnh Sửa & Bàn Giao Tài Sản */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Chỉnh Sửa Tài Sản [${selectedAsset?.code}]`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditAsset} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mã Tài Sản <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên Tài Sản / Thiết Bị <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Danh Mục Tài Sản
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Giá Trị Đầu Tư (VND)
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bàn Giao / Cấp Cho Nhân Viên
              </label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">— Thu hồi về kho (Chưa cấp ai) —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tình Trạng Thiết Bị
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="AVAILABLE">Sẵn Sàng Cấp Phát (Kho)</option>
                <option value="IN_USE">Đang Sử Dụng</option>
                <option value="MAINTENANCE">Đang Bảo Trì / Sửa Chữa</option>
                <option value="BROKEN">Hỏng Hóc</option>
                <option value="LIQUIDATED">Đã Thanh Lý</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vị Trí Đặt Thiết Bị
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ghi Chú Cấu Hình / Số Serial
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Cập Nhật Tài Sản
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
