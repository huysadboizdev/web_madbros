import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Mail,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  User as UserIcon,
  AlertTriangle,
  AlertCircle,
  Pencil,
} from 'lucide-react';

type MeetingPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const MEETING_PRIORITY_OPTIONS: Array<{ value: MeetingPriority; label: string; dotClass: string }> = [
  { value: 'LOW', label: 'Thấp', dotClass: 'bg-sky-500' },
  { value: 'MEDIUM', label: 'Trung bình', dotClass: 'bg-amber-400' },
  { value: 'HIGH', label: 'Cao', dotClass: 'bg-orange-500' },
  { value: 'URGENT', label: 'Khẩn cấp', dotClass: 'bg-rose-500' },
];

const MeetingPriorityBadge: React.FC<{ priority?: MeetingPriority }> = ({ priority = 'MEDIUM' }) => {
  const styles: Record<MeetingPriority, string> = {
    LOW: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    URGENT: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  };
  const label = MEETING_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || 'Trung bình';
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold border ${styles[priority]}`}>{label}</span>;
};

interface MeetingItem {
  id: string;
  title: string;
  description?: string | null;
  priority: MeetingPriority;
  meetingLink?: string | null;
  location?: string | null;
  startTime: string;
  endTime: string;
  notifyAll: boolean;
  createdBy: { id: string; name: string; email: string };
  participants: {
    userId: string;
    status: string;
    user: { id: string; name: string; email: string; avatar?: string };
  }[];
}

// Helper convert ISO date string to YYYY-MM-DDTHH:mm for datetime-local input
const toLocalDatetimeInputValue = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper validate meeting startTime
const validateStartTime = (val: string): string | null => {
  if (!val || !val.trim()) return 'Vui lòng chọn thời gian bắt đầu cuộc họp';
  const d = new Date(val);
  if (isNaN(d.getTime())) return 'Thời gian bắt đầu không hợp lệ';
  if (d.getTime() < Date.now() - 60000) return 'Thời gian bắt đầu không được nằm trong quá khứ';
  return null;
};

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { subscribe } = useSocket();
  const isLight = theme === 'light';
  const canScheduleMeeting = true;

  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'upcoming' | 'today' | 'my' | 'all' | 'past'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | MeetingPriority>('ALL');
  const [members, setMembers] = useState<any[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for create
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MeetingPriority>('MEDIUM');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [notifyAll, setNotifyAll] = useState(true);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form states for edit meeting
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<MeetingPriority>('MEDIUM');
  const [editLocation, setEditLocation] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editMeetingError, setEditMeetingError] = useState<string | null>(null);
  const [editNotifyAll, setEditNotifyAll] = useState(true);
  const [editSelectedParticipantIds, setEditSelectedParticipantIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchMembers();

    // ⚡ Real-Time WebSocket: Lắng nghe sự kiện lịch họp
    const unsubCreated = subscribe('meeting:created', () => {
      fetchMeetings();
    });
    const unsubUpdated = subscribe('meeting:updated', () => {
      fetchMeetings();
    });
    const unsubDeleted = subscribe('meeting:deleted', () => {
      fetchMeetings();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [subscribe]);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeframe, searchTerm, priorityFilter, pageSize]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/meetings');
      setMeetings(res.data);
    } catch (error) {
      console.error('Lỗi tải danh sách cuộc họp', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/workspace/members');
      setMembers(res.data);
    } catch (error) {
      console.error('Lỗi tải thành viên workspace', error);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const err = validateStartTime(startTime);
    if (err) {
      setMeetingError(err);
      return;
    }

    try {
      setCreating(true);
      const start = new Date(startTime);

      await api.post('/meetings', {
        title: title.trim(),
        description: description.trim(),
        priority,
        location: location.trim() || null,
        startTime: start.toISOString(),
        notifyAll,
        participantIds: notifyAll ? [] : selectedParticipantIds,
        sendEmail,
      });

      setShowCreateModal(false);
      resetForm();
      fetchMeetings();
    } catch (error: any) {
      setMeetingError(error.response?.data?.message || 'Lỗi khi tạo cuộc họp');
    } finally {
      setCreating(false);
    }
  };

  // Mở modal chỉnh sửa cuộc họp
  const openEditModal = (meeting: MeetingItem) => {
    setEditingMeeting(meeting);
    setEditTitle(meeting.title);
    setEditDescription(meeting.description || '');
    setEditPriority(meeting.priority || 'MEDIUM');
    setEditLocation(meeting.location || '');
    setEditStartTime(toLocalDatetimeInputValue(meeting.startTime));
    setEditMeetingError(null);
    setEditNotifyAll(meeting.notifyAll);
    setEditSelectedParticipantIds(meeting.participants?.map((p) => p.userId) || []);
    setShowEditModal(true);
  };

  // Lưu chỉnh sửa cuộc họp
  const handleSaveEditMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editTitle.trim()) return;

    const err = validateStartTime(editStartTime);
    if (err) {
      setEditMeetingError(err);
      return;
    }

    try {
      setSavingEdit(true);
      const start = new Date(editStartTime);

      await api.put(`/meetings/${editingMeeting.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        location: editLocation.trim() || null,
        startTime: start.toISOString(),
        notifyAll: editNotifyAll,
        participantIds: editNotifyAll ? [] : editSelectedParticipantIds,
      });

      setShowEditModal(false);
      setEditingMeeting(null);
      setEditMeetingError(null);
      fetchMeetings();
    } catch (error: any) {
      setEditMeetingError(error.response?.data?.message || 'Lỗi khi cập nhật cuộc họp');
    } finally {
      setSavingEdit(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setLocation('');
    setStartTime('');
    setMeetingError(null);
    setNotifyAll(true);
    setSelectedParticipantIds([]);
    setSendEmail(true);
  };

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);

  const handleDeleteMeeting = (meetingId: string) => {
    setDeletingMeetingId(meetingId);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDeleteMeeting = async () => {
    if (!deletingMeetingId) return;
    try {
      await api.delete(`/meetings/${deletingMeetingId}`);
      setShowDeleteConfirmModal(false);
      setDeletingMeetingId(null);
      fetchMeetings();
    } catch (error) {
      console.error('Lỗi xóa cuộc họp', error);
    }
  };

  const handleUpdateStatus = async (meetingId: string, status: string) => {
    try {
      await api.post(`/meetings/${meetingId}/status`, { status });
      fetchMeetings();
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái', error);
    }
  };

  // Filter meetings based on timeframe and search
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.location && m.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const now = new Date();
    const start = new Date(m.startTime);

    const isToday = start.toDateString() === now.toDateString();

    let matchesTimeframe = true;
    if (timeframe === 'upcoming') {
      matchesTimeframe = start >= new Date(now.getTime() - 60 * 60 * 1000);
    } else if (timeframe === 'today') {
      matchesTimeframe = isToday;
    } else if (timeframe === 'my') {
      matchesTimeframe =
        m.createdBy?.id === user?.id ||
        m.participants?.some((p) => p.userId === user?.id);
    } else if (timeframe === 'past') {
      matchesTimeframe = start < now;
    }

    const matchesPriority = priorityFilter === 'ALL' || (m.priority || 'MEDIUM') === priorityFilter;
    return matchesSearch && matchesTimeframe && matchesPriority;
  });

  // Pagination calculations
  const totalItems = filteredMeetings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedMeetings = filteredMeetings.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight break-words leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Lịch Họp & Kế Hoạch Đội Ngũ
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shrink-0 ${
                isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
              }`}
            >
              {totalItems} Cuộc Họp
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Đặt lịch họp, tự động đồng bộ lịch và thông báo tới toàn bộ thành viên qua Telegram & Web
          </p>
        </div>

        {canScheduleMeeting && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" /> Đặt Lịch Họp Mới
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto min-w-0">
          <button
            onClick={() => setTimeframe('upcoming')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Sắp Tới
          </button>
          <button
            onClick={() => setTimeframe('today')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'today'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            🔥 Hôm Nay
          </button>
          <button
            onClick={() => setTimeframe('my')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'my'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Cuộc Họp Của Tôi
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Tất Cả ({meetings.length})
          </button>
          <button
            onClick={() => setTimeframe('past')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === 'past'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Đã Qua
          </button>
        </div>

        <div className="flex flex-col min-[480px]:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc họp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition border ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | MeetingPriority)}
            aria-label="Lọc cuộc họp theo mức ưu tiên"
            className={`w-full min-[480px]:w-auto px-3 py-2 rounded-xl text-xs font-bold focus:outline-none border cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700 text-slate-300'
            }`}
          >
            <option value="ALL">Tất cả ưu tiên</option>
            {MEETING_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          <div className={`flex items-center gap-1.5 text-xs shrink-0 self-end min-[480px]:self-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-lg text-xs focus:outline-none border cursor-pointer ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
              }`}
            >
              <option value={6}>6 họp</option>
              <option value={9}>9 họp</option>
              <option value={18}>18 họp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meeting Cards Widescreen Grid (3 Columns on xl) */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paginatedMeetings.length === 0 ? (
        <div className={`rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border space-y-3 shadow-xl ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/60' : 'glass-panel border-white/[0.08]'
        }`}>
          <Calendar className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
          <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>Không có cuộc họp nào phù hợp</h3>
          <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Hãy thử đổi bộ lọc hoặc bấm "Đặt Lịch Họp Mới" để lên kế hoạch làm việc với đội ngũ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
          {paginatedMeetings.map((m) => {
            const isCreator = m.createdBy.id === user?.id;
            const myParticipant = m.participants.find((p) => p.userId === user?.id);

            return (
              <div
                key={m.id}
                className={`p-4 min-[360px]:p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 space-y-3.5 sm:space-y-4 relative flex flex-col justify-between ${
                  isLight
                    ? 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800 shadow-slate-200/50'
                    : 'glass-panel border-white/[0.08] hover:border-indigo-500/40 text-slate-200'
                }`}
              >
                {/* Header info */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
                      isLight
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}>
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {new Date(m.startTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <MeetingPriorityBadge priority={m.priority} />

                    {(isCreator || user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'MANAGER') && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(m)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isLight
                              ? 'text-indigo-600 hover:bg-indigo-50'
                              : 'text-indigo-400 hover:bg-indigo-500/10'
                          }`}
                          title="Chỉnh sửa cuộc họp & giờ họp"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeeting(m.id)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isLight
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title="Hủy cuộc họp"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-sm sm:text-base lg:text-lg font-bold tracking-tight line-clamp-2 break-words ${isLight ? 'text-slate-900' : 'text-white'}`}>{m.title}</h3>
                    <p className={`text-[11px] sm:text-xs font-medium mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      📅 {new Date(m.startTime).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {m.description && (
                    <p className={`text-xs p-3 rounded-xl sm:rounded-2xl border whitespace-pre-wrap line-clamp-3 break-words ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}>
                      {m.description}
                    </p>
                  )}

                  {/* Location */}
                  {m.location && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300'
                    }`}>
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-medium truncate">{m.location}</span>
                    </div>
                  )}
                </div>

                {/* Participants list & RSVP footer */}
                <div className={`pt-3 border-t space-y-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <div className={`flex items-center justify-between text-[11px] sm:text-xs flex-wrap gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {m.participants.length} người tham gia
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-500 truncate">Tổ chức: {m.createdBy.name}</span>
                  </div>

                  {/* RSVP buttons if invited */}
                  {myParticipant && myParticipant.status === 'INVITED' && (
                    <div className="flex flex-col min-[360px]:flex-row min-[360px]:items-center justify-between gap-2 pt-1 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20">
                      <span className="text-xs text-indigo-300 font-medium">Bạn tham gia chứ?</span>
                      <div className="flex items-center gap-1.5 self-end min-[360px]:self-auto">
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'ACCEPTED')}
                          className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30 flex items-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Có
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'DECLINED')}
                          className="px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold hover:bg-rose-600/30 flex items-center gap-1 transition cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Không
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md ${
        isLight ? 'bg-white border-slate-200 text-slate-600 shadow-slate-200/50' : 'glass-panel border-white/[0.08] text-slate-400'
      }`}>
        <div className="text-center sm:text-left">
          Đang hiển thị <strong className={isLight ? 'text-slate-900' : 'text-white'}>{startIndex + 1}</strong> - <strong className={isLight ? 'text-slate-900' : 'text-white'}>{endIndex}</strong> trong tổng số <strong className="text-indigo-600 dark:text-indigo-400">{totalItems}</strong> cuộc họp
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer ${
              isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl font-bold transition cursor-pointer ${
                      currentPage === p
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isLight
                        ? 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                        : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1.5 rounded-xl border disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer ${
              isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Sau <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal Tạo Lịch Họp */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Đặt Lịch Họp Mới (Tự Động Gửi Email & Thông Báo)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Chủ Đề Cuộc Họp <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp giao ban đầu tuần & Triển khai kế hoạch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Nội Dung & Mục Tiêu Cuộc Họp
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chú nội dung thảo luận, tài liệu chuẩn bị trước..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Mức Độ Ưu Tiên
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MEETING_PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${priority === option.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isLight ? 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50' : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-indigo-500/50'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Thời Gian Bắt Đầu <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                min={toLocalDatetimeInputValue(new Date())}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (e.target.value) {
                    setMeetingError(validateStartTime(e.target.value));
                  } else {
                    setMeetingError(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition ${
                  meetingError
                    ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                } ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/60 border-slate-700 text-white'
                }`}
              />
              {meetingError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{meetingError}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Địa Điểm Họp / Phòng Họp Trực Tiếp
              </label>
              <input
                type="text"
                placeholder="VD: Phòng họp Tầng 3 / Trụ sở chính"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Người tham gia */}
          <div>
            <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1.5 mb-2">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Thành Viên Tham Gia
              </label>
              <label className={`flex items-center gap-2 text-xs cursor-pointer ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={notifyAll}
                  onChange={(e) => setNotifyAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Mời toàn bộ ({members.length} người)
              </label>
            </div>

            {!notifyAll && (
              <div className={`flex flex-wrap gap-2 p-3 rounded-xl border max-h-36 overflow-y-auto ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                {members.map((m) => {
                  const isSelected = selectedParticipantIds.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== m.id));
                        } else {
                          setSelectedParticipantIds([...selectedParticipantIds, m.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                          : isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                      }`}
                    >
                      <UserIcon className="w-3 h-3" />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`pt-4 border-t flex flex-col min-[380px]:flex-row justify-end gap-2 sm:gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
            >
              {creating ? 'Đang tạo lịch họp...' : 'Đặt Lịch Họp Mới'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chỉnh Sửa Lịch Họp */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Chỉnh Sửa Cuộc Họp & Giờ Họp"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEditMeeting} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Chủ Đề Cuộc Họp <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp giao ban đầu tuần & Triển khai kế hoạch"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Nội Dung & Mục Tiêu Cuộc Họp
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chú nội dung thảo luận, tài liệu chuẩn bị trước..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className={`w-full px-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Mức Độ Ưu Tiên
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MEETING_PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEditPriority(option.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${editPriority === option.value
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isLight ? 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50' : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-indigo-500/50'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Thời Gian Bắt Đầu <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={editStartTime}
                onChange={(e) => {
                  setEditStartTime(e.target.value);
                  if (e.target.value) {
                    setEditMeetingError(validateStartTime(e.target.value));
                  } else {
                    setEditMeetingError(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition ${
                  editMeetingError
                    ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                } ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/60 border-slate-700 text-white'
                }`}
              />
              {editMeetingError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editMeetingError}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Địa Điểm Họp / Phòng Họp Trực Tiếp
              </label>
              <input
                type="text"
                placeholder="VD: Phòng họp Tầng 3 / Trụ sở chính"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Người tham gia */}
          <div>
            <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1.5 mb-2">
              <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Thành Viên Tham Gia
              </label>
              <label className={`flex items-center gap-2 text-xs cursor-pointer ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={editNotifyAll}
                  onChange={(e) => setEditNotifyAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Mời toàn bộ ({members.length} người)
              </label>
            </div>

            {!editNotifyAll && (
              <div className={`flex flex-wrap gap-2 p-3 rounded-xl border max-h-36 overflow-y-auto ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/60'
              }`}>
                {members.map((m) => {
                  const isSelected = editSelectedParticipantIds.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        if (isSelected) {
                          setEditSelectedParticipantIds(editSelectedParticipantIds.filter((id) => id !== m.id));
                        } else {
                          setEditSelectedParticipantIds([...editSelectedParticipantIds, m.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                          : isLight
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                      }`}
                    >
                      <UserIcon className="w-3 h-3" />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`pt-4 border-t flex flex-col min-[380px]:flex-row justify-end gap-2 sm:gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer text-center"
            >
              {savingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi Cuộc Họp'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác Nhận Hủy Cuộc Họp Đẹp Mắt */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Xác Nhận Hủy Cuộc Họp"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                Bạn có chắc chắn muốn hủy và xóa cuộc họp này?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Lịch họp và danh sách điểm danh người tham gia sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
            </div>
          </div>

          <div className={`pt-3 border-t flex flex-col min-[380px]:flex-row justify-end gap-2 sm:gap-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowDeleteConfirmModal(false)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              Quay Lại
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteMeeting}
              className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Trash2 className="w-4 h-4" /> Hủy Cuộc Họp
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
