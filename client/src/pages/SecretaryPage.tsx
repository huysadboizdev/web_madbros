import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/StatCard';
import { Modal } from '../components/Modal';
import { AnnouncementsFeed } from '../components/AnnouncementsFeed';
import { TelegramTagPicker } from '../components/TelegramTagPicker';
import {
  FileSignature,
  Calendar,
  CheckSquare,
  Users,
  Plus,
  Search,
  Clock,
  Video,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Send,
  Sparkles,
  Crown,
  ChevronRight,
  Filter,
  ExternalLink,
  MessageSquare,
  Trash2,
  RefreshCw,
  Bell,
  Check,
  X,
  Layers,
  ArrowUpRight,
  ListTodo,
  TrendingUp,
  Megaphone,
  Pencil,
} from 'lucide-react';

type MeetingPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

const MEETING_PRIORITY_OPTIONS: Array<{ value: MeetingPriority; label: string; dotClass: string }> = [
  { value: 'LOW', label: 'Thấp', dotClass: 'bg-sky-500' },
  { value: 'MEDIUM', label: 'Trung bình', dotClass: 'bg-amber-400' },
  { value: 'HIGH', label: 'Cao', dotClass: 'bg-orange-500' },
  { value: 'URGENT', label: 'Khẩn cấp', dotClass: 'bg-rose-500' },
];

const getMeetingPriorityMeta = (priority?: MeetingPriority) => {
  const current = priority || 'MEDIUM';
  const className: Record<MeetingPriority, string> = {
    LOW: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    URGENT: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  };
  return {
    label: MEETING_PRIORITY_OPTIONS.find((option) => option.value === current)?.label || 'Trung bình',
    className: className[current],
  };
};

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

// Helper combine Date (YYYY-MM-DD) and Time (HH:mm) into ISO UTC string
const combineDateAndTimeToIso = (dateStr: string, timeStr: string): string | null => {
  if (!dateStr || !dateStr.trim()) return null;
  const time = timeStr && timeStr.trim() ? timeStr.trim() : '23:59';
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

// Helper validate Deadline inputs (Date + Time must not be in the past)
const validateDeadlineInputs = (dateVal: string, timeVal: string): string | null => {
  if (!dateVal && !timeVal) {
    return null;
  }
  if (!dateVal) {
    return 'Vui lòng chọn ngày hoàn thành';
  }
  if (!timeVal) {
    return 'Vui lòng chọn giờ hoàn thành (VD: 17:30 hoặc 23:59)';
  }

  const [year, month, day] = dateVal.split('-').map(Number);
  const [hours, minutes] = timeVal.split(':').map(Number);
  const selectedDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
  const now = new Date();

  if (isNaN(selectedDate.getTime())) {
    return 'Thời gian hạn chót không hợp lệ';
  }

  if (selectedDate.getTime() <= now.getTime()) {
    const isToday =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();

    if (isToday) {
      const currentHourMinute = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `Giờ hoàn thành (${timeVal}) phải lớn hơn giờ hiện tại (${currentHourMinute})`;
    } else {
      return 'Hạn chót không được nằm trong quá khứ';
    }
  }

  return null;
};

// Helper validate meeting startTime
const validateStartTime = (val: string): string | null => {
  if (!val || !val.trim()) return 'Vui lòng chọn thời gian bắt đầu cuộc họp';
  const d = new Date(val);
  if (isNaN(d.getTime())) return 'Thời gian bắt đầu không hợp lệ';
  if (d.getTime() < Date.now() - 60000) return 'Thời gian bắt đầu không được nằm trong quá khứ';
  return null;
};

// Helper format task due date with both Time and Date
const formatTaskDueDate = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${time} • ${date}`;
};

export const SecretaryPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'TASKS' | 'MEETINGS' | 'ANNOUNCEMENTS' | 'BRIEFING'>('TASKS');

  // Filter states
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('ALL');
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingPriorityFilter, setMeetingPriorityFilter] = useState<'ALL' | MeetingPriority>('ALL');

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Form: Create Delegated Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [taskDueDateDate, setTaskDueDateDate] = useState('');
  const [taskDueDateTime, setTaskDueDateTime] = useState('');
  const [taskDeadlineError, setTaskDeadlineError] = useState<string | null>(null);
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<{ title: string; assignedToId?: string }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [taskSendEmail, setTaskSendEmail] = useState(true);
  const [taskTelegramTag, setTaskTelegramTag] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Form: Create Delegated Meeting
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingPriority, setMeetingPriority] = useState<MeetingPriority>('MEDIUM');
  const [meetingStartTime, setMeetingStartTime] = useState('');
  const [meetingStartTimeError, setMeetingStartTimeError] = useState<string | null>(null);
  const [meetingHostId, setMeetingHostId] = useState(user?.id || '');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingParticipantIds, setMeetingParticipantIds] = useState<string[]>([]);
  const [meetingSendEmail, setMeetingSendEmail] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  // Form: Edit Delegated Meeting
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [editMeetingTitle, setEditMeetingTitle] = useState('');
  const [editMeetingDescription, setEditMeetingDescription] = useState('');
  const [editMeetingPriority, setEditMeetingPriority] = useState<MeetingPriority>('MEDIUM');
  const [editMeetingStartTime, setEditMeetingStartTime] = useState('');
  const [editMeetingStartTimeError, setEditMeetingStartTimeError] = useState<string | null>(null);
  const [editMeetingLocation, setEditMeetingLocation] = useState('');
  const [editMeetingParticipantIds, setEditMeetingParticipantIds] = useState<string[]>([]);
  const [savingEditMeeting, setSavingEditMeeting] = useState(false);

  const { subscribe } = useSocket();

  // Toast / Status Message
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    fetchInitialData();

    // ⚡ Real-Time WebSocket: Đồng bộ công việc và lịch họp tức thì cho Ban Thư Ký
    const unsubTaskCreated = subscribe('task:created', () => {
      api.get('/tasks').then((res) => setTasks(res.data || []));
    });
    const unsubTaskUpdated = subscribe('task:updated', () => {
      api.get('/tasks').then((res) => setTasks(res.data || []));
    });
    const unsubTaskDeleted = subscribe('task:deleted', () => {
      api.get('/tasks').then((res) => setTasks(res.data || []));
    });
    const unsubMeetingCreated = subscribe('meeting:created', () => {
      api.get('/meetings').then((res) => setMeetings(res.data || []));
    });
    const unsubMeetingUpdated = subscribe('meeting:updated', () => {
      api.get('/meetings').then((res) => setMeetings(res.data || []));
    });
    const unsubMeetingDeleted = subscribe('meeting:deleted', () => {
      api.get('/meetings').then((res) => setMeetings(res.data || []));
    });

    return () => {
      unsubTaskCreated();
      unsubTaskUpdated();
      unsubTaskDeleted();
      unsubMeetingCreated();
      unsubMeetingUpdated();
      unsubMeetingDeleted();
    };
  }, [subscribe]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [tasksRes, meetingsRes, workspaceRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/meetings'),
        api.get('/workspaces'),
      ]);
      setTasks(tasksRes.data || []);
      setMeetings(meetingsRes.data || []);
      setMembers(workspaceRes.data?.users || []);
      if (workspaceRes.data?.users?.length > 0 && !meetingHostId) {
        // Set default host as first admin or current user
        const firstAdmin = workspaceRes.data.users.find((u: any) => u.role === 'ADMIN');
        setMeetingHostId(firstAdmin?.id || user?.id || '');
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu thư ký', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, success = true) => {
    setMessage({ text, success });
    setTimeout(() => setMessage(null), 4000);
  };

  // ==========================================
  // 1. TASK DELEGATION HANDLERS
  // ==========================================
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim() }]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleCreateDelegatedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      setCreatingTask(true);
      await api.post('/tasks', {
        title: `[Chỉ Đạo BGD] ${taskTitle.trim()}`,
        description: taskDescription ? `📋 Chỉ đạo từ Ban Giám Đốc:\n${taskDescription}` : '📋 Giao việc theo chỉ đạo của Ban Giám Đốc.',
        priority: taskPriority,
        assigneeIds: taskAssigneeIds,
        subtasks: subtasks.map((s) => ({ title: s.title })),
        sendEmail: taskSendEmail,
        telegramTag: taskTelegramTag.trim() || null,
      });

      showToast('Đã phân công và giao việc thay Ban Giám Đốc thành công!');
      setShowCreateTaskModal(false);
      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('HIGH');
      setTaskDueDateDate('');
      setTaskDueDateTime('');
      setTaskDeadlineError(null);
      setTaskAssigneeIds([]);
      setSubtasks([]);
      setTaskTelegramTag('');
      const tasksRes = await api.get('/tasks');
      setTasks(tasksRes.data || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi khi giao việc', false);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/review`, {
        approved: true,
        feedback: 'Thư ký / Trợ lý đã đại diện Ban Giám Đốc nghiệm thu kết quả đạt chuẩn.',
      });
      showToast('Đã đại diện Ban Giám Đốc phê duyệt hoàn thành công việc!');
      const tasksRes = await api.get('/tasks');
      setTasks(tasksRes.data || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi duyệt task', false);
    }
  };

  const handleRejectTaskWithFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !reviewFeedback.trim()) return;

    try {
      await api.post(`/tasks/${selectedTask.id}/review`, {
        approved: false,
        feedback: reviewFeedback.trim(),
      });
      showToast('Đã gửi yêu cầu chỉnh sửa / làm lại cho nhân sự!');
      setShowReviewModal(false);
      setSelectedTask(null);
      setReviewFeedback('');
      const tasksRes = await api.get('/tasks');
      setTasks(tasksRes.data || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi gửi phản hồi', false);
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy / xóa công việc "${title}"?`)) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      showToast('Đã xóa công việc thành công!');
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi khi xóa task', false);
    }
  };

  // ==========================================
  // 2. MEETING SCHEDULER HANDLERS
  // ==========================================
  const handleCreateDelegatedMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    const err = validateStartTime(meetingStartTime);
    if (err) {
      setMeetingStartTimeError(err);
      return;
    }

    try {
      setCreatingMeeting(true);
      const start = new Date(meetingStartTime);

      await api.post('/meetings', {
        title: `[Lịch Họp BGD] ${meetingTitle.trim()}`,
        description: meetingDescription ? `📋 Lịch họp do Thư ký sắp xếp theo chỉ đạo của BGD:\n${meetingDescription}` : '📋 Cuộc họp do Thư ký sắp xếp theo chỉ đạo của Ban Giám Đốc.',
        priority: meetingPriority,
        startTime: start.toISOString(),
        location: meetingLocation.trim() || null,
        hostId: meetingHostId || user?.id,
        participantIds: meetingParticipantIds,
        sendEmail: meetingSendEmail,
      });

      showToast('Đã lên lịch họp thay Ban Giám Đốc thành công!');
      setShowCreateMeetingModal(false);
      // Reset form
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingPriority('MEDIUM');
      setMeetingStartTime('');
      setMeetingStartTimeError(null);
      setMeetingLocation('');
      setMeetingParticipantIds([]);
      const meetingsRes = await api.get('/meetings');
      setMeetings(meetingsRes.data || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi khi tạo lịch họp', false);
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string, title: string) => {
    if (!window.confirm(`Hủy lịch họp "${title}"? Thông báo hủy sẽ được cập nhật cho các thành viên.`)) return;
    try {
      await api.delete(`/meetings/${meetingId}`);
      showToast('Đã hủy cuộc họp thành công!');
      setMeetings(meetings.filter((m) => m.id !== meetingId));
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi khi hủy cuộc họp', false);
    }
  };

  const openEditMeetingModal = (meeting: any) => {
    setEditingMeeting(meeting);
    setEditMeetingTitle(meeting.title || '');
    setEditMeetingDescription(meeting.description || '');
    setEditMeetingPriority(meeting.priority || 'MEDIUM');
    setEditMeetingStartTime(toLocalDatetimeInputValue(meeting.startTime));
    setEditMeetingStartTimeError(null);
    setEditMeetingLocation(meeting.location || '');
    setEditMeetingParticipantIds(meeting.participants?.map((p: any) => p.userId || p.user?.id) || []);
    setShowEditMeetingModal(true);
  };

  const handleSaveEditMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editMeetingTitle.trim()) return;

    const err = validateStartTime(editMeetingStartTime);
    if (err) {
      setEditMeetingStartTimeError(err);
      return;
    }

    try {
      setSavingEditMeeting(true);
      const start = new Date(editMeetingStartTime);

      await api.put(`/meetings/${editingMeeting.id}`, {
        title: editMeetingTitle.trim(),
        description: editMeetingDescription.trim(),
        priority: editMeetingPriority,
        startTime: start.toISOString(),
        location: editMeetingLocation.trim() || null,
        participantIds: editMeetingParticipantIds,
      });

      showToast('Cập nhật cuộc họp thành công!');
      setShowEditMeetingModal(false);
      setEditingMeeting(null);
      setEditMeetingStartTimeError(null);
      const meetingsRes = await api.get('/meetings');
      setMeetings(meetingsRes.data || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Lỗi khi cập nhật cuộc họp', false);
    } finally {
      setSavingEditMeeting(false);
    }
  };

  // Filtered Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      !taskSearch ||
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.assignees?.some((a: any) => a.name.toLowerCase().includes(taskSearch.toLowerCase()));

    const matchStatus = taskStatusFilter === 'ALL' || t.status === taskStatusFilter;
    const matchPriority = taskPriorityFilter === 'ALL' || t.priority === taskPriorityFilter;

    return matchSearch && matchStatus && matchPriority;
  });

  // Filtered Meetings
  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch = !meetingSearch || m.title.toLowerCase().includes(meetingSearch.toLowerCase()) || m.location?.toLowerCase().includes(meetingSearch.toLowerCase());
    const matchesPriority = meetingPriorityFilter === 'ALL' || (m.priority || 'MEDIUM') === meetingPriorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Stat metrics
  const pendingAcceptTasksCount = tasks.filter((t) => t.status === 'PENDING_ACCEPT').length;
  const inProgressTasksCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const reviewTasksCount = tasks.filter((t) => t.status === 'REVIEW').length;
  const doneTasksCount = tasks.filter((t) => t.status === 'DONE').length;
  const upcomingMeetingsCount = meetings.filter((m) => new Date(m.startTime) >= new Date()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Đang tải dữ liệu Ban Thư Ký & Trợ Lý Điều Hành...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all animate-in slide-in-from-bottom-5 border ${
            message.success
              ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-emerald-500/20'
              : 'bg-rose-600 text-white border-rose-400/50 shadow-rose-500/20'
          }`}
        >
          {message.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* 1. Executive Secretary Top Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border shadow-xl backdrop-blur-xl transition-all duration-300 ${
          isLight
            ? 'bg-gradient-to-r from-rose-100/80 via-pink-50 to-white border-rose-200 shadow-rose-500/5'
            : 'bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-indigo-950/40 border-rose-500/30 shadow-2xl'
        }`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span
                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold flex items-center gap-1.5 border shadow-sm ${
                  isLight
                    ? 'bg-rose-100 border-rose-300 text-rose-800'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
              >
                <FileSignature className="w-3.5 h-3.5" /> BAN THƯ KÝ & TRỢ LÝ ĐIỀU HÀNH
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 border ${
                  isLight ? 'bg-purple-100 border-purple-200 text-purple-800' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                }`}
              >
                <Crown className="w-3 h-3 text-amber-500" /> Đại Diện Ban Giám Đốc
              </span>
            </div>

            <h1 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight break-words leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Trung Tâm Điều Phối & Lên Lịch Thay Sếp
            </h1>
            <p className={`text-xs sm:text-sm max-w-3xl leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Thực hiện quyền ủy thác của Ban Giám Đốc: Phân công công việc cho các phòng ban, lên lịch họp doanh nghiệp, đôn đốc tiến độ và tổng hợp báo cáo kết quả.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              <Plus className="w-4 h-4" /> Giao Việc Thay Sếp
            </button>
            <button
              onClick={() => setShowCreateMeetingModal(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              <Calendar className="w-4 h-4" /> Lên Lịch Họp Thay Sếp
            </button>
            <button
              onClick={() => setActiveSubTab('ANNOUNCEMENTS')}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-md sm:shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              <Megaphone className="w-4 h-4" /> Phát Thông Báo
            </button>
            <button
              onClick={fetchInitialData}
              title="Làm mới dữ liệu"
              className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition cursor-pointer flex items-center justify-center ${
                isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Key Metrics Summary Grid */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
        <StatCard
          title="Tổng Việc Đã Giao Thay Sếp"
          value={tasks.length}
          subtitle={`${doneTasksCount} việc đã hoàn thành`}
          icon={<CheckSquare className="w-6 h-6" />}
          trend={`${inProgressTasksCount} việc đang chạy`}
          trendPositive={true}
          color="rose"
        />

        <StatCard
          title="Chờ Nhân Sự Tiếp Nhận"
          value={pendingAcceptTasksCount}
          subtitle="Công việc mới được giao"
          icon={<ListTodo className="w-6 h-6" />}
          trend={pendingAcceptTasksCount > 0 ? 'Cần đôn đốc nhận' : 'Đã nhận đủ'}
          trendPositive={pendingAcceptTasksCount === 0}
          color="amber"
        />

        <StatCard
          title="Lịch Họp Do Thư Ký Sắp Xếp"
          value={upcomingMeetingsCount}
          subtitle={`Tổng số: ${meetings.length} cuộc họp`}
          icon={<Calendar className="w-6 h-6" />}
          trend="Họp trực tuyến & Trực tiếp"
          trendPositive={true}
          color="purple"
        />

        <StatCard
          title="Báo Cáo Chờ Nghiệm Thu"
          value={reviewTasksCount}
          subtitle="Cần thư ký kiểm tra & duyệt"
          icon={<Sparkles className="w-6 h-6" />}
          trend={reviewTasksCount > 0 ? 'Có việc chờ duyệt' : 'Đã duyệt xong'}
          trendPositive={reviewTasksCount === 0}
          color="emerald"
        />
      </div>

      {/* 3. Sub-navigation Tabs */}
      <div className={`p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border flex flex-wrap items-center gap-1.5 sm:gap-2 w-full max-w-3xl min-w-0 ${
        isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <button
          onClick={() => setActiveSubTab('TASKS')}
          className={`flex-1 min-w-[120px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeSubTab === 'TASKS'
              ? isLight
                ? 'bg-white text-rose-600 shadow-sm'
                : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Điều Phối Việc ({tasks.length})
        </button>

        <button
          onClick={() => setActiveSubTab('MEETINGS')}
          className={`flex-1 min-w-[120px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeSubTab === 'MEETINGS'
              ? isLight
                ? 'bg-white text-purple-600 shadow-sm'
                : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Lịch Họp BGD ({meetings.length})
        </button>

        <button
          onClick={() => setActiveSubTab('ANNOUNCEMENTS')}
          className={`flex-1 min-w-[130px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeSubTab === 'ANNOUNCEMENTS'
              ? isLight
                ? 'bg-white text-amber-600 shadow-sm'
                : 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Bảng Tin Thông Báo
        </button>

        <button
          onClick={() => setActiveSubTab('BRIEFING')}
          className={`flex-1 min-w-[110px] py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeSubTab === 'BRIEFING'
              ? isLight
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Báo Cáo Sếp
        </button>
      </div>

      {/* ==========================================
          TAB 1: ĐIỀU PHỐI CÔNG VIỆC THAY SẾP
      ========================================== */}
      {activeSubTab === 'TASKS' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}>
            <div className="relative flex-1 min-w-0 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm công việc theo tên hoặc người thực hiện..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/80 border-slate-700/80 text-white'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:flex md:items-center gap-2 w-full md:w-auto">
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none transition border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING_ACCEPT">⏳ Chờ nhân viên nhận việc</option>
                <option value="IN_PROGRESS">⚡ Đang thực hiện</option>
                <option value="REVIEW">🎯 Chờ duyệt nghiệm thu</option>
                <option value="DONE">✅ Đã hoàn thành</option>
              </select>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none transition border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
                }`}
              >
                <option value="ALL">Mọi mức độ ưu tiên</option>
                <option value="URGENT">🔴 Khẩn cấp (Ưu tiên số 1)</option>
                <option value="HIGH">🟠 Cao</option>
                <option value="MEDIUM">🔵 Bình thường</option>
                <option value="LOW">⚪ Thấp</option>
              </select>
            </div>
          </div>

          {/* Tasks Table & Mobile Cards */}
          <div className={`rounded-3xl shadow-xl overflow-hidden border ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`font-semibold border-b uppercase tracking-wider text-[10px] ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'
                  }`}
                >
                  <tr>
                    <th className="py-3.5 px-4">Tên Công Việc & Chỉ Đạo Của Sếp</th>
                    <th className="py-3.5 px-4">Người Thực Hiện</th>
                    <th className="py-3.5 px-4">Độ Ưu Tiên</th>
                    <th className="py-3.5 px-4">Tiến Độ</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác Thư Ký</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
                  {filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50/80 text-slate-800' : 'hover:bg-slate-800/40 text-slate-200'
                      }`}
                    >
                      <td className="py-4 px-4 max-w-xs">
                        <div className="space-y-1">
                          <p className={`font-bold text-xs leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {t.title}
                          </p>
                          {t.description && (
                            <p className={`text-[11px] line-clamp-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {t.description}
                            </p>
                          )}
                          {t.completionNote && (
                            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-[11px]">
                              <strong>Báo cáo kết quả:</strong> {t.completionNote}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {t.assignees?.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-1.5" title={`${a.name} (${a.email})`}>
                              <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center border border-rose-500/30">
                                {a.name?.slice(0, 1)?.toUpperCase()}
                              </div>
                              <span className="font-semibold text-xs">{a.name}</span>
                            </div>
                          ))}
                          {(!t.assignees || t.assignees.length === 0) && (
                            <span className="text-slate-400 italic">Chưa gán</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            t.priority === 'URGENT'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : t.priority === 'MEDIUM'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-slate-500/15 text-slate-500 border-slate-500/30'
                          }`}
                        >
                          {t.priority === 'URGENT' ? '🔴 Khẩn Cấp' : t.priority === 'HIGH' ? '🟠 Cao' : t.priority === 'MEDIUM' ? '🔵 Bình Thường' : '⚪ Thấp'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{t.progress || 0}% hoàn thành</p>
                          <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-rose-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${t.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                            t.status === 'DONE'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : t.status === 'REVIEW'
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 animate-pulse'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {t.status === 'DONE'
                            ? '✅ Đã Hoàn Thành'
                            : t.status === 'REVIEW'
                            ? '🎯 Chờ Nghiệm Thu'
                            : t.status === 'IN_PROGRESS'
                            ? '⚡ Đang Làm'
                            : '⏳ Chờ Nhận Việc'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === 'REVIEW' && (
                            <button
                              onClick={() => handleApproveTask(t.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow transition cursor-pointer flex items-center gap-1"
                              title="Duyệt kết quả thay Ban Giám Đốc"
                            >
                              <Check className="w-3 h-3" /> Duyệt
                            </button>
                          )}

                          {t.status === 'REVIEW' && (
                            <button
                              onClick={() => {
                                setSelectedTask(t);
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold shadow transition cursor-pointer flex items-center gap-1"
                              title="Góp ý / Yêu cầu làm lại"
                            >
                              <MessageSquare className="w-3 h-3" /> Góp ý
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTask(t.id, t.title)}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Xóa công việc"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        Chưa có công việc nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="md:hidden p-3 space-y-3">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border space-y-3 shadow-sm ${
                    isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className={`font-bold text-sm break-words ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {t.title}
                      </h4>
                      {t.description && (
                        <p className={`text-[11px] line-clamp-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          t.priority === 'URGENT'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : t.priority === 'HIGH'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : t.priority === 'MEDIUM'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : 'bg-slate-500/15 text-slate-500 border-slate-500/30'
                        }`}
                      >
                        {t.priority === 'URGENT' ? '🔴 Khẩn' : t.priority === 'HIGH' ? '🟠 Cao' : t.priority === 'MEDIUM' ? '🔵 Vừa' : '⚪ Thấp'}
                      </span>
                    </div>
                  </div>

                  {t.completionNote && (
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-[11px]">
                      <strong>Báo cáo kết quả:</strong> {t.completionNote}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Người làm:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {t.assignees?.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-1 text-[11px] font-semibold">
                            <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[9px] flex items-center justify-center border border-rose-500/30">
                              {a.name?.slice(0, 1)?.toUpperCase()}
                            </div>
                            <span className="truncate max-w-[80px]">{a.name}</span>
                          </div>
                        ))}
                        {(!t.assignees || t.assignees.length === 0) && (
                          <span className="text-slate-400 italic text-[11px]">Chưa gán</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Trạng thái:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                          t.status === 'DONE'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : t.status === 'REVIEW'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {t.status === 'DONE'
                          ? '✅ Xong'
                          : t.status === 'REVIEW'
                          ? '🎯 Chờ duyệt'
                          : t.status === 'IN_PROGRESS'
                          ? '⚡ Đang làm'
                          : '⏳ Chờ nhận'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Tiến độ công việc</span>
                      <span className="font-bold text-rose-500">{t.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${t.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {t.status === 'REVIEW' && (
                      <button
                        onClick={() => handleApproveTask(t.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Duyệt
                      </button>
                    )}
                    {t.status === 'REVIEW' && (
                      <button
                        onClick={() => {
                          setSelectedTask(t);
                          setShowReviewModal(true);
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Góp ý
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(t.id, t.title)}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                      title="Xóa công việc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Chưa có công việc nào phù hợp với bộ lọc
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: LỊCH HỌP DOANH NGHIỆP THAY SẾP
      ========================================== */}
      {activeSubTab === 'MEETINGS' && (
        <div className="space-y-5">
          {/* Meeting Search & Action */}
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm cuộc họp theo tiêu đề hoặc địa điểm..."
                value={meetingSearch}
                onChange={(e) => setMeetingSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition border ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900/80 border-slate-700/80 text-white'
                }`}
              />
            </div>

            <select
              value={meetingPriorityFilter}
              onChange={(e) => setMeetingPriorityFilter(e.target.value as 'ALL' | MeetingPriority)}
              aria-label="Lọc cuộc họp theo mức ưu tiên"
              className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:border-purple-500 cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-900/80 border-slate-700 text-slate-300'
              }`}
            >
              <option value="ALL">Tất cả ưu tiên</option>
              {MEETING_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <button
              onClick={() => setShowCreateMeetingModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Lên Lịch Họp Mới
            </button>
          </div>

          {/* Meetings Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMeetings.map((m) => {
              const isPast = new Date(m.startTime) < new Date();
              const acceptedCount = m.participants?.filter((p: any) => p.status === 'ACCEPTED').length || 0;
              const priorityMeta = getMeetingPriorityMeta(m.priority);

              return (
                <div
                  key={m.id}
                  className={`p-5 rounded-3xl border shadow-lg transition-all duration-300 hover:-translate-y-1 space-y-4 ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-slate-200/50'
                      : 'glass-panel border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isPast
                            ? 'bg-slate-500/15 text-slate-500 border-slate-500/30'
                            : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                        }`}
                      >
                        {isPast ? 'Đã diễn ra' : 'Sắp diễn ra'}
                      </span>
                      <span className={`inline-block ml-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${priorityMeta.className}`}>
                        {priorityMeta.label}
                      </span>
                      <h3 className={`font-bold text-sm leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {m.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditMeetingModal(m)}
                        className="text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 p-1.5 rounded-lg transition cursor-pointer"
                        title="Chỉnh sửa cuộc họp & giờ họp"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(m.id, m.title)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition cursor-pointer"
                        title="Hủy cuộc họp"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {m.description && (
                    <p className={`text-xs line-clamp-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {m.description}
                    </p>
                  )}

                  <div className={`p-3 rounded-2xl border space-y-2 text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-500" /> Bắt đầu:
                      </span>
                      <span className="font-semibold">{new Date(m.startTime).toLocaleString('vi-VN')}</span>
                    </div>

                    {m.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" /> Địa điểm:
                        </span>
                        <span className="font-semibold truncate max-w-[180px]">{m.location}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" /> Chủ trì:
                      </span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {m.host?.name || 'Ban Giám Đốc'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Điểm danh (RSVP):
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {acceptedCount}/{m.participants?.length || 0} tham dự
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMeetings.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">
                Chưa có cuộc họp nào được lên lịch
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: BÁO CÁO TỔNG HỢP TRÌNH SẾP
      ========================================== */}
      {activeSubTab === 'BRIEFING' && (
        <div className="space-y-6">
          <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}>
            <div className={`pb-4 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h3 className={`text-base sm:text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  📋 Tóm Tắt Tình Hình Vận Hành Doanh Nghiệp (1-Phút Trình Sếp)
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Bản tổng hợp tự động các chỉ số công việc, lịch họp và các đầu việc cần Ban Giám Đốc lưu ý.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-950/20 border-blue-500/20'
              }`}>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  ⚡ Tiến Độ Thực Thi
                </p>
                <h4 className="text-2xl font-extrabold">{tasks.length > 0 ? Math.round((doneTasksCount / tasks.length) * 100) : 100}%</h4>
                <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {doneTasksCount}/{tasks.length} hạng mục đã hoàn thành nghiệm thu.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-purple-50/60 border-purple-200' : 'bg-purple-950/20 border-purple-500/20'
              }`}>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  📅 Lịch Họp Tuần Này
                </p>
                <h4 className="text-2xl font-extrabold">{upcomingMeetingsCount} cuộc họp</h4>
                <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Tất cả nhân sự liên quan đã nhận thông báo và xác nhận lịch.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-amber-950/20 border-amber-500/20'
              }`}>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  ⚠️ Việc Cần Lưu Ý
                </p>
                <h4 className="text-2xl font-extrabold">{pendingAcceptTasksCount + reviewTasksCount} đầu việc</h4>
                <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Gồm {pendingAcceptTasksCount} việc chờ nhân sự nhận và {reviewTasksCount} việc chờ duyệt.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: BẢNG TIN & PHÁT THÔNG BÁO THAY SẾP
      ========================================== */}
      {activeSubTab === 'ANNOUNCEMENTS' && (
        <div className="space-y-6">
          <AnnouncementsFeed />
        </div>
      )}

      {/* ==========================================
          MODAL: GIAO VIỆC THAY SẾP
      ========================================== */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        title="⚡ Phân Công & Giao Việc Thay Ban Giám Đốc"
      >
        <form onSubmit={handleCreateDelegatedTask} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tiêu Đề Công Việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Triển khai chiến dịch Marketing Quý 3"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Chỉ Đạo Chi Tiết Từ Ban Giám Đốc
            </label>
            <textarea
              rows={3}
              placeholder="Ghi rõ yêu cầu, tiêu chuẩn chất lượng và chỉ đạo cụ thể của Sếp..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-rose-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          <div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Mức Độ Ưu Tiên
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-rose-500 transition cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              >
                <option value="URGENT">🔴 Khẩn Cấp (Ưu tiên hàng đầu)</option>
                <option value="HIGH">🟠 Cao</option>
                <option value="MEDIUM">🔵 Bình Thường</option>
                <option value="LOW">⚪ Thấp</option>
              </select>
            </div>

            <div className="hidden" aria-hidden="true">
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <span>Hạn Chót (Deadline)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {['12:00', '17:30', '21:00', '23:59'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setTaskDueDateTime(preset);
                        if (taskDueDateDate) {
                          setTaskDeadlineError(validateDeadlineInputs(taskDueDateDate, preset));
                        }
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                        taskDueDateTime === preset
                          ? 'bg-rose-600 text-white shadow-sm'
                          : isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={taskDueDateDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setTaskDueDateDate(e.target.value);
                      if (e.target.value || taskDueDateTime) {
                        setTaskDeadlineError(validateDeadlineInputs(e.target.value, taskDueDateTime));
                      } else {
                        setTaskDeadlineError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                      taskDeadlineError
                        ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                        : 'focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    } ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <input
                    type="time"
                    value={taskDueDateTime}
                    placeholder="Chọn giờ"
                    onChange={(e) => {
                      setTaskDueDateTime(e.target.value);
                      if (taskDueDateDate || e.target.value) {
                        setTaskDeadlineError(validateDeadlineInputs(taskDueDateDate, e.target.value));
                      } else {
                        setTaskDeadlineError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                      taskDeadlineError
                        ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                        : 'focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    } ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {taskDeadlineError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{taskDeadlineError}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Phân Công Cho Nhân Sự Chịu Trách Nhiệm
            </label>
            <div className={`p-3 rounded-2xl border max-h-36 overflow-y-auto space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              {members.map((m) => {
                const isSelected = taskAssigneeIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? isLight ? 'bg-rose-100 text-rose-900' : 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                        : isLight ? 'hover:bg-slate-200/60' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTaskAssigneeIds([...taskAssigneeIds, m.id]);
                          } else {
                            setTaskAssigneeIds(taskAssigneeIds.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded border-slate-400 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-bold">{m.name}</span>
                      <span className="text-[10px] text-slate-400">({m.role})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{m.email}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Subtasks checklist */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Checklist Việc Con
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Thêm hạng mục con cần làm..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Thêm
              </button>
            </div>

            {subtasks.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-500/10 text-xs mb-1">
                <span>• {s.title}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(idx)}
                  className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Tag Telegram (@username) */}
          <TelegramTagPicker
            value={taskTelegramTag}
            onChange={setTaskTelegramTag}
            label="Tag Telegram Người Nhận Chỉ Đạo (@username)"
            helperText="Bot sẽ tag thẳng các người nhận trên Telegram để đôn đốc nhận việc tức thì."
          />

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={taskSendEmail}
              onChange={(e) => setTaskSendEmail(e.target.checked)}
              className="rounded border-slate-400 text-rose-600 focus:ring-rose-500"
            />
            <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Gửi email thông báo chỉ đạo trực tiếp cho nhân viên
            </span>
          </label>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowCreateTaskModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creatingTask}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {creatingTask ? 'Đang giao việc...' : 'Xác Nhận Giao Việc Thay Sếp'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL: LÊN LỊCH HỌP THAY SẾP
      ========================================== */}
      <Modal
        isOpen={showCreateMeetingModal}
        onClose={() => setShowCreateMeetingModal(false)}
        title="📅 Lên Lịch Họp Doanh Nghiệp Thay Ban Giám Đốc"
      >
        <form onSubmit={handleCreateDelegatedMeeting} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tiêu Đề Cuộc Họp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp giao ban đầu tuần Ban Giám Đốc & Trưởng Phòng"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Nội Dung & Mục Đích Cuộc Họp
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả chương trình họp, tài liệu cần chuẩn bị..."
              value={meetingDescription}
              onChange={(e) => setMeetingDescription(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
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
                  onClick={() => setMeetingPriority(option.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${meetingPriority === option.value
                    ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20'
                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-purple-500/50'}`}
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
                Thời Gian Bắt Đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                min={toLocalDatetimeInputValue(new Date())}
                value={meetingStartTime}
                onChange={(e) => {
                  setMeetingStartTime(e.target.value);
                  if (e.target.value) {
                    setMeetingStartTimeError(validateStartTime(e.target.value));
                  } else {
                    setMeetingStartTimeError(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition ${
                  meetingStartTimeError
                    ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                    : 'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                } ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
              {meetingStartTimeError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{meetingStartTimeError}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Địa Điểm / Phòng Họp Trực Tiếp
              </label>
              <input
                type="text"
                placeholder="VD: Phòng Họp VIP Tầng 5"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-purple-500 transition ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Người Chủ Trì Cuộc Họp (Host)
            </label>
            <select
              value={meetingHostId}
              onChange={(e) => setMeetingHostId(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-purple-500 transition ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Thành Viên Tham Dự Cuộc Họp
            </label>
            <div className={`p-3 rounded-2xl border max-h-36 overflow-y-auto space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              {members.map((m) => {
                const isSelected = meetingParticipantIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? isLight ? 'bg-purple-100 text-purple-900' : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : isLight ? 'hover:bg-slate-200/60' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMeetingParticipantIds([...meetingParticipantIds, m.id]);
                          } else {
                            setMeetingParticipantIds(meetingParticipantIds.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded border-slate-400 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-bold">{m.name}</span>
                      <span className="text-[10px] text-slate-400">({m.role})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{m.email}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={meetingSendEmail}
              onChange={(e) => setMeetingSendEmail(e.target.checked)}
              className="rounded border-slate-400 text-purple-600 focus:ring-purple-500"
            />
            <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Gửi email thư mời lịch họp tới tất cả người tham gia
            </span>
          </label>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowCreateMeetingModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creatingMeeting}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> {creatingMeeting ? 'Đang lên lịch...' : 'Xác Nhận Lên Lịch Họp'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL: GÓP Ý / YÊU CẦU LÀM LẠI
      ========================================== */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="💬 Nhận Xét & Yêu Cầu Chỉnh Sửa Thay Sếp"
      >
        <form onSubmit={handleRejectTaskWithFeedback} className="space-y-4">
          <div>
            <p className={`text-xs mb-2 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Công việc: <strong className="text-rose-500">{selectedTask?.title}</strong>
            </p>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Nhận Xét / Nội Dung Cần Làm Lại <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Ghi rõ điểm chưa đạt và chỉ đạo chỉnh sửa chi tiết..."
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" /> Gửi Yêu Cầu Chỉnh Sửa
            </button>
          </div>
        </form>
      </Modal>

      {/* ==========================================
          MODAL: CHỈNH SỬA CUỘC HỌP THAY SẾP
      ========================================== */}
      <Modal
        isOpen={showEditMeetingModal}
        onClose={() => setShowEditMeetingModal(false)}
        title="✏️ Chỉnh Sửa Lịch Họp Doanh Nghiệp"
      >
        <form onSubmit={handleSaveEditMeeting} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tiêu Đề Cuộc Họp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Họp giao ban đầu tuần Ban Giám Đốc & Trưởng Phòng"
              value={editMeetingTitle}
              onChange={(e) => setEditMeetingTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Nội Dung & Mục Đích Cuộc Họp
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả chương trình họp, tài liệu cần chuẩn bị..."
              value={editMeetingDescription}
              onChange={(e) => setEditMeetingDescription(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-500 transition border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
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
                  onClick={() => setEditMeetingPriority(option.value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${editMeetingPriority === option.value
                    ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20'
                    : isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-purple-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-purple-500/50'}`}
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
                Thời Gian Bắt Đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={editMeetingStartTime}
                onChange={(e) => {
                  setEditMeetingStartTime(e.target.value);
                  if (e.target.value) {
                    setEditMeetingStartTimeError(validateStartTime(e.target.value));
                  } else {
                    setEditMeetingStartTimeError(null);
                  }
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border focus:outline-none transition ${
                  editMeetingStartTimeError
                    ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                    : 'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                } ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
              {editMeetingStartTimeError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editMeetingStartTimeError}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Địa Điểm / Phòng Họp Trực Tiếp
              </label>
              <input
                type="text"
                placeholder="VD: Phòng Hội Nghị Tầng 2"
                value={editMeetingLocation}
                onChange={(e) => setEditMeetingLocation(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-purple-500 transition ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Thành Viên Tham Dự Cuộc Họp
            </label>
            <div className={`p-3 rounded-2xl border max-h-36 overflow-y-auto space-y-1.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              {members.map((m) => {
                const isSelected = editMeetingParticipantIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? isLight ? 'bg-purple-100 text-purple-900' : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : isLight ? 'hover:bg-slate-200/60' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditMeetingParticipantIds([...editMeetingParticipantIds, m.id]);
                          } else {
                            setEditMeetingParticipantIds(editMeetingParticipantIds.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded border-slate-400 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-bold">{m.name}</span>
                      <span className="text-[10px] text-slate-400">({m.role})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{m.email}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowEditMeetingModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingEditMeeting}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> {savingEditMeeting ? 'Đang lưu...' : 'Lưu Thay Đổi Cuộc Họp'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
