import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [members, setMembers] = useState<any[]>([]);

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
  }, [timeframe]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/meetings?timeframe=${timeframe}`);
      setMeetings(res.data);
    } catch (error) {
      console.error('Lỗi tải cuộc họp', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/workspaces');
      setMembers(res.data.users || []);
    } catch (error) {
      console.error('Lỗi tải thành viên', error);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    try {
      setCreating(true);
      await api.post('/meetings', {
        title,
        description,
        meetingLink: meetingLink.trim() || null,
        location: location.trim() || null,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        notifyAll,
        participantIds: notifyAll ? [] : selectedParticipantIds,
        sendEmail,
      });

      // Reset
      setTitle('');
      setDescription('');
      setMeetingLink('');
      setLocation('');
      setStartTime('');
      setEndTime('');
      setNotifyAll(true);
      setSelectedParticipantIds([]);
      setSendEmail(true);
      setShowCreateModal(false);

      fetchMeetings();
    } catch (error) {
      console.error('Lỗi tạo cuộc họp', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy cuộc họp này?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Lỗi xóa họp', error);
    }
  };

  const handleUpdateStatus = async (meetingId: string, status: 'ACCEPTED' | 'DECLINED') => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lịch Họp & Thông Báo Email
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Đặt lịch họp, tự động gửi thư mời Email và thông báo tới toàn bộ thành viên công ty
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Đặt Lịch Họp Mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-2 rounded-2xl border border-slate-800 flex items-center gap-2 w-fit">
        <button
          onClick={() => setTimeframe('upcoming')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
            timeframe === 'upcoming'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sắp Tới
        </button>
        <button
          onClick={() => setTimeframe('past')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
            timeframe === 'past'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Đã Qua
        </button>
        <button
          onClick={() => setTimeframe('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
            timeframe === 'all'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tất Cả
        </button>
      </div>

      {/* Meeting Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">Không có lịch họp nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy bấm nút "Đặt Lịch Họp Mới" để tạo cuộc họp và tự động gửi email thông báo tới toàn bộ thành viên.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {meetings.map((m) => {
            const isCreator = m.createdBy.id === user?.id;
            const myParticipant = m.participants.find((p) => p.userId === user?.id);

            return (
              <div
                key={m.id}
                className="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-indigo-500/40 transition shadow-xl space-y-4 relative"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Clock className="w-3 h-3" />
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
                    <h3 className="text-base font-bold text-white mt-1">{m.title}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      📅 {new Date(m.startTime).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {isCreator && (
                    <button
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Hủy cuộc họp"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {m.description && (
                  <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 whitespace-pre-wrap">
                    {m.description}
                  </p>
                )}

                {/* Location & Link */}
                <div className="space-y-2 text-xs">
                  {m.location && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{m.location}</span>
                    </div>
                  )}

                  {m.meetingLink && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                      <div className="flex items-center gap-2 truncate mr-2">
                        <Video className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-blue-200 font-medium truncate">{m.meetingLink}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyMeetingLink(m.meetingLink!)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50"
                          title="Sao chép link"
                        >
                          {copiedLink === m.meetingLink ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={m.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                        >
                          Tham gia <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Participants list */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      {m.participants.length} người tham gia ({m.notifyAll ? 'Toàn bộ công ty' : 'Chỉ định'})
                    </span>
                    <span className="text-[11px]">Tạo bởi: {m.createdBy.name}</span>
                  </div>

                  {/* RSVP buttons if invited */}
                  {myParticipant && myParticipant.status === 'INVITED' && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-slate-300 font-medium">Bạn tham gia chứ?</span>
                      <button
                        onClick={() => handleUpdateStatus(m.id, 'ACCEPTED')}
                        className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Tham gia
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(m.id, 'DECLINED')}
                        className="px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold hover:bg-rose-600/30 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Đặt Lịch Họp Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Đặt Lịch Họp & Gửi Email Thông Báo"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tiêu Đề Cuộc Họp <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp Báo Cáo Tiến Độ Tuần & Định Hướng Mới"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Link Phòng Họp Trực Tuyến (Google Meet / Zoom)
            </label>
            <input
              type="url"
              placeholder="https://meet.google.com/xyz-abcd-efg"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Địa Điểm Trực Tiếp (Nếu có)
            </label>
            <input
              type="text"
              placeholder="VD: Phòng Họp Lớn Tầng 2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nội Dung & Ghi Chú Họp
            </label>
            <textarea
              rows={3}
              placeholder="Nội dung thảo luận, tài liệu chuẩn bị..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Target participants */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Gửi Thông Báo Tới:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotifyAll(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    notifyAll ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Toàn Bộ Công Ty
                </button>
                <button
                  type="button"
                  onClick={() => setNotifyAll(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    !notifyAll ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Chọn Thành Viên
                </button>
              </div>
            </div>

            {!notifyAll && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.name} ({m.email})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
              />
              <label htmlFor="sendEmail" className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Tự động gửi email thông báo HTML tới hòm thư cá nhân của mọi người
              </label>
            </div>
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
              disabled={creating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Calendar className="w-4 h-4" /> Tạo Lịch & Gửi Mail
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
