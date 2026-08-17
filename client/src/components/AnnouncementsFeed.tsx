import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { Modal } from './Modal';
import {
  Megaphone,
  Pin,
  Trash2,
  Send,
  Sparkles,
  AlertTriangle,
  Clock,
  User as UserIcon,
  CheckCircle2,
  Flame,
  AlertCircle,
  Plus,
} from 'lucide-react';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  pinned: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
  };
}

export const AnnouncementsFeed: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { subscribe } = useSocket();
  const isLight = theme === 'light';

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Soạn thông báo
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [pinned, setPinned] = useState(false);
  const [telegramTag, setTelegramTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Xóa
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canPost =
    user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'MANAGER';

  useEffect(() => {
    fetchAnnouncements();

    const unsubNew = subscribe('announcement:new', (newAnn: AnnouncementItem) => {
      setAnnouncements((prev) => [newAnn, ...prev.filter((a) => a.id !== newAnn.id)]);
    });

    const unsubUp = subscribe('announcement:updated', (upAnn: AnnouncementItem) => {
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === upAnn.id ? { ...a, ...upAnn } : a))
      );
    });

    const unsubDel = subscribe('announcement:deleted', ({ id }: { id: string }) => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    });

    return () => {
      unsubNew();
      unsubUp();
      unsubDel();
    };
  }, [subscribe]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (error) {
      console.error('Lỗi tải thông báo chung', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post('/announcements', {
        title: title.trim(),
        content: content.trim(),
        priority,
        pinned,
        telegramTag: telegramTag.trim() || null,
      });

      setSuccessMsg(res.data.message || 'Đã phát thông báo thành công!');
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setPinned(false);
      setTelegramTag('');
      setTimeout(() => {
        setSuccessMsg(null);
        setShowCreateModal(false);
      }, 1500);

      fetchAnnouncements();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi phát thông báo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await api.patch(`/announcements/${id}/pin`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Lỗi ghim thông báo', error);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/announcements/${deletingId}`);
      setShowDeleteModal(false);
      setDeletingId(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Lỗi xóa thông báo', error);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                isLight
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base sm:text-lg font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Bảng Tin & Thông Báo Chung Toàn Công Ty
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  {announcements.length} Tin
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                Các vấn đề chỉ đạo, kế hoạch mới, thông báo tức thì qua Web & Telegram
              </p>
            </div>
          </div>

          {canPost && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition flex items-center gap-2 hover:scale-105 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Soạn Thông Báo
            </button>
          )}
        </div>

        {/* Announcements List Feed */}
        <div className="pt-4 space-y-3.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              Đang tải bảng tin thông báo...
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có thông báo chung nào. Ban Giám Đốc hoặc Thư Ký có thể soạn thông báo để gửi tới toàn công ty và Telegram!
            </div>
          ) : (
            announcements.map((item) => {
              const isUrgent = item.priority === 'URGENT';
              const isImportant = item.priority === 'IMPORTANT';

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative ${
                    item.pinned
                      ? isLight
                        ? 'bg-amber-50/70 border-amber-300 shadow-md shadow-amber-500/5'
                        : 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : isUrgent
                      ? isLight
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-rose-950/20 border-rose-500/40'
                      : isImportant
                      ? isLight
                        ? 'bg-orange-50/70 border-orange-300'
                        : 'bg-orange-950/20 border-orange-500/40'
                      : isLight
                      ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Author, Role, Time & Priority Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {item.createdBy.name ? item.createdBy.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.createdBy.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                              item.createdBy.role === 'ADMIN'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                                : item.createdBy.role === 'SECRETARY'
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                : 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {item.createdBy.role === 'ADMIN'
                              ? 'Tổng Giám Đốc'
                              : item.createdBy.role === 'SECRETARY'
                              ? 'Ban Thư Ký'
                              : 'Quản Lý'}
                          </span>
                          {item.pinned && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                              <Pin className="w-2.5 h-2.5" /> Đã ghim
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {formatTime(item.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Priority Badge & Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {isUrgent ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> Khẩn Cấp
                        </span>
                      ) : isImportant ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-orange-500/20 border border-orange-500/40 text-orange-600 dark:text-orange-400 flex items-center gap-1 shadow-sm">
                          <Flame className="w-3 h-3 text-orange-500" /> Quan Trọng
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Megaphone className="w-3 h-3" /> Thông Báo
                        </span>
                      )}

                      {canPost && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => handleTogglePin(item.id)}
                            className={`p-1.5 rounded-xl border transition cursor-pointer ${
                              item.pinned
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400'
                                : isLight
                                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-500'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
                            }`}
                            title={item.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingId(item.id);
                              setShowDeleteModal(true);
                            }}
                            className={`p-1.5 rounded-xl border transition cursor-pointer ${
                              isLight
                                ? 'bg-white hover:bg-rose-50 border-slate-300 hover:border-rose-300 text-slate-500 hover:text-rose-600'
                                : 'bg-slate-800 hover:bg-rose-900/30 border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400'
                            }`}
                            title="Xóa thông báo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Body Content */}
                  <h4 className={`text-sm sm:text-base font-extrabold mb-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {item.title}
                  </h4>
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {item.content}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Soạn Thông Báo Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Phát Thông Báo Chung (Đồng Bộ Web & Telegram)"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {successMsg}
            </div>
          )}

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tiêu Đề Thông Báo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Kế hoạch làm việc tuần mới, Thông báo nghỉ lễ, v.v..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-rose-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Mức Độ Ưu Tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-rose-500 transition cursor-pointer ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              >
                <option value="NORMAL">📢 Bình Thường (Thông Báo Nội Bộ)</option>
                <option value="IMPORTANT">🔥 Quan Trọng (Cần Chú Ý)</option>
                <option value="URGENT">🚨 Khẩn Cấp (Yêu Cầu Đọc Ngay)</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Tag Telegram (@username / @all)
              </label>
              <input
                type="text"
                placeholder="@username hoặc để trống"
                value={telegramTag}
                onChange={(e) => setTelegramTag(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-rose-500 transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Nội Dung Thông Báo Chi Tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Nhập nội dung cần truyền đạt tới toàn thể cán bộ nhân viên công ty..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-rose-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pinAnnouncement"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded cursor-pointer"
            />
            <label htmlFor="pinAnnouncement" className={`text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              📌 Ghim thông báo này lên đầu bảng tin
            </label>
          </div>

          <div className={`flex justify-end gap-2.5 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Đang phát thông báo...' : 'Phát Thông Báo Ngay'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác Nhận Xóa Thông Báo */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Xác Nhận Xóa Thông Báo"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                Bạn có chắc muốn xóa thông báo này?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thông báo sẽ bị xóa khỏi bảng tin của toàn bộ công ty.
              </p>
            </div>
          </div>

          <div className={`pt-3 border-t flex justify-end gap-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              Quay Lại
            </button>
            <button
              type="button"
              onClick={handleDeleteAnnouncement}
              className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Xóa Vĩnh Viễn
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
