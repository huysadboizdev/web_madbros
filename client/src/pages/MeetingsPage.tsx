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
} from 'lucide-react';

interface MeetingItem {
  id: string;
  title: string;
  description?: string | null;
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

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { subscribe } = useSocket();
  const isLight = theme === 'light';
  const canScheduleMeeting = user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'MANAGER';

  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'upcoming' | 'today' | 'my' | 'all' | 'past'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notifyAll, setNotifyAll] = useState(true);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [creating, setCreating] = useState(false);

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
  }, [timeframe, searchTerm, pageSize]);

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
    if (!title || !startTime || !endTime) return;

    try {
      setCreating(true);
      await api.post('/meetings', {
        title: title.trim(),
        description: description.trim(),
        meetingLink: meetingLink.trim(),
        location: location.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        notifyAll,
        participantIds: notifyAll ? [] : selectedParticipantIds,
        sendEmail,
      });

      setShowCreateModal(false);
      resetForm();
      fetchMeetings();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo cuộc họp');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setMeetingLink('');
    setLocation('');
    setStartTime('');
    setEndTime('');
    setNotifyAll(true);
    setSelectedParticipantIds([]);
    setSendEmail(true);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy và xóa cuộc họp này?')) return;
    try {
      await api.delete(`/meetings/${meetingId}`);
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

  const copyMeetingLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Filter meetings based on timeframe and search
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.location && m.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const now = new Date();
    const start = new Date(m.startTime);
    const end = new Date(m.endTime);

    const isToday =
      start.toDateString() === now.toDateString() ||
      (start <= now && end >= now);

    let matchesTimeframe = true;
    if (timeframe === 'upcoming') {
      matchesTimeframe = end >= now;
    } else if (timeframe === 'today') {
      matchesTimeframe = isToday;
    } else if (timeframe === 'my') {
      matchesTimeframe =
        m.createdBy?.id === user?.id ||
        m.participants?.some((p) => p.userId === user?.id);
    } else if (timeframe === 'past') {
      matchesTimeframe = end < now;
    }

    return matchesSearch && matchesTimeframe;
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
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Lịch Họp & Kế Hoạch Đội Ngũ
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isLight ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
              }`}
            >
              {totalItems} Cuộc Họp
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Đặt lịch họp, tự động gửi thư mời Email và thông báo tới toàn bộ thành viên công ty
          </p>
        </div>

        {canScheduleMeeting && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Đặt Lịch Họp Mới
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setTimeframe('upcoming')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
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

          <div className={`flex items-center gap-1.5 text-xs shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-lg text-xs focus:outline-none border ${
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
        <div className={`rounded-3xl p-12 text-center border space-y-3 shadow-xl ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/60' : 'glass-panel border-white/[0.08]'
        }`}>
          <Calendar className={`w-12 h-12 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>Không có cuộc họp nào phù hợp</h3>
          <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
            Hãy thử đổi bộ lọc hoặc bấm "Đặt Lịch Họp Mới" để lên kế hoạch làm việc với đội ngũ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {paginatedMeetings.map((m) => {
            const isCreator = m.createdBy.id === user?.id;
            const myParticipant = m.participants.find((p) => p.userId === user?.id);

            return (
              <div
                key={m.id}
                className={`p-6 rounded-3xl border transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 space-y-4 relative flex flex-col justify-between ${
                  isLight
                    ? 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800 shadow-slate-200/50'
                    : 'glass-panel border-white/[0.08] hover:border-indigo-500/40 text-slate-200'
                }`}
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isLight
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    }`}>
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {new Date(m.startTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(m.endTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {(isCreator || user?.role === 'ADMIN') && (
                      <button
                        onClick={() => handleDeleteMeeting(m.id)}
                        className={`p-1.5 rounded-lg transition ${
                          isLight
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                        title="Hủy cuộc họp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{m.title}</h3>
                    <p className={`text-xs font-medium mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      📅 {new Date(m.startTime).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {m.description && (
                    <p className={`text-xs p-3 rounded-2xl border whitespace-pre-wrap line-clamp-3 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}>
                      {m.description}
                    </p>
                  )}

                  {/* Location & Link */}
                  <div className="space-y-2 text-xs">
                    {m.location && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-700'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300'
                      }`}>
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span className="font-medium">{m.location}</span>
                      </div>
                    )}

                    {m.meetingLink && (
                      <div className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border ${
                        isLight
                          ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                          : 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                      }`}>
                        <div className="flex items-center gap-2 truncate mr-2">
                          <Video className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className={`text-xs font-medium truncate ${isLight ? 'text-blue-900' : 'text-blue-200'}`}>{m.meetingLink}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => copyMeetingLink(m.meetingLink!)}
                            className={`p-1.5 rounded-lg transition ${
                              isLight
                                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                            title="Sao chép link"
                          >
                            {copiedLink === m.meetingLink ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-600/30 transition hover:scale-105"
                          >
                            Vào họp <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Participants list & RSVP footer */}
                <div className={`pt-3 border-t space-y-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <div className={`flex items-center justify-between text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <span className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      {m.participants.length} người tham gia
                    </span>
                    <span className="text-[11px] text-slate-500">Tổ chức: {m.createdBy.name}</span>
                  </div>

                  {/* RSVP buttons if invited */}
                  {myParticipant && myParticipant.status === 'INVITED' && (
                    <div className="flex items-center justify-between gap-2 pt-1 bg-indigo-950/20 p-2 rounded-xl border border-indigo-500/20">
                      <span className="text-xs text-indigo-300 font-medium">Bạn tham gia chứ?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'ACCEPTED')}
                          className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30 flex items-center gap-1 transition"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Có
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(m.id, 'DECLINED')}
                          className="px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold hover:bg-rose-600/30 flex items-center gap-1 transition"
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
      <div className="glass-panel p-4 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shadow-md">
        <div>
          Đang hiển thị <strong className="text-white">{startIndex + 1}</strong> - <strong className="text-white">{endIndex}</strong> trong tổng số <strong className="text-indigo-400">{totalItems}</strong> cuộc họp
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-slate-600">...</span>}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl font-bold transition ${
                      currentPage === p
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
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
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Chủ Đề Cuộc Họp <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp giao ban đầu tuần & Triển khai kế hoạch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nội Dung & Mục Tiêu Cuộc Họp
            </label>
            <textarea
              rows={3}
              placeholder="Ghi chú nội dung thảo luận, tài liệu chuẩn bị trước..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Thời Gian Bắt Đầu <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Thời Gian Kết Thúc <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Link Phòng Họp Online (Google Meet / Zoom / Teams)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xyz-abcd-efg"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Địa Điểm Họp Trực Tiếp (Nếu có)
              </label>
              <input
                type="text"
                placeholder="VD: Phòng họp Tầng 3 / Trụ sở chính"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Người tham gia */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Thành Viên Tham Gia
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyAll}
                  onChange={(e) => setNotifyAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Mời toàn bộ thành viên ({members.length} người)
              </label>
            </div>

            {!notifyAll && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 max-h-36 overflow-y-auto">
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
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
              disabled={creating}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {creating ? 'Đang tạo & gửi mail...' : 'Đặt Lịch & Gửi Thư Mời'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
