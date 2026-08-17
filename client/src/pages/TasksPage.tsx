import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { Modal } from '../components/Modal';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Check,
  X,
  FileCheck,
  Send,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  assignedTo?: { id: string; name: string };
  dueDate?: string;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  acceptanceStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  acceptedAt?: string;
  declinedReason?: string;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING_ACCEPT' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  dueDate?: string;
  progress: number;
  totalSubtasks: number;
  completedSubtasks: number;
  assignees: Assignee[];
  subtasks: Subtask[];
  completionReport?: string;
  submittedAt?: string;
  reviewFeedback?: string;
  reviewedAt?: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Role Scope & Filter
  const isMember = user?.role === 'MEMBER';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canCreateTask = user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'MANAGER';
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MY_TASKS' | 'PENDING_MY_ACCEPT' | 'TODAY' | 'REVIEW'>(
    isMember ? 'MY_TASKS' : 'ALL'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Workspace members
  const [members, setMembers] = useState<any[]>([]);
  const { subscribe } = useSocket();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const selectedTaskRef = useRef<TaskItem | null>(null);
  selectedTaskRef.current = selectedTask;

  // Submit Review modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [completionNote, setCompletionNote] = useState('');

  // Review Modal (Approve / Reject)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Decline Modal
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Form states for create
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [initialSubtasks, setInitialSubtasks] = useState<{ title: string }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Inline subtask input
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchMembers();

    // ⚡ Real-Time WebSocket: Lắng nghe các thay đổi task và cập nhật tức thì không cần F5
    const unsubCreated = subscribe('task:created', () => {
      fetchTasks();
    });

    const unsubUpdated = subscribe('task:updated', (data) => {
      fetchTasks();
      if (selectedTaskRef.current?.id === data?.taskId) {
        api.get('/tasks').then((res) => {
          const found = res.data.find((t: any) => t.id === data.taskId);
          if (found) setSelectedTask(found);
        });
      }
    });

    const unsubDeleted = subscribe('task:deleted', (data) => {
      fetchTasks();
      if (selectedTaskRef.current?.id === data?.taskId) {
        setSelectedTask(null);
      }
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [subscribe]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPriority, filterStatus, scopeFilter, pageSize]);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (error) {
      console.error('Lỗi tải công việc', error);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.post('/tasks', {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assigneeIds: selectedAssigneeIds,
        subtasks: initialSubtasks.filter((s) => s.title.trim().length > 0),
        sendEmail: true,
      });

      // Reset
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setSelectedAssigneeIds([]);
      setInitialSubtasks([]);
      setShowCreateModal(false);

      fetchTasks();
    } catch (error) {
      console.error('Lỗi tạo công việc', error);
    }
  };

  // 1. Tiếp nhận Task
  const handleAcceptTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/accept`);
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          status: 'IN_PROGRESS',
          assignees: selectedTask.assignees.map((a) =>
            a.id === user?.id ? { ...a, acceptanceStatus: 'ACCEPTED' } : a
          ),
        });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi tiếp nhận task');
    }
  };

  // 2. Từ chối Task
  const handleDeclineTask = async () => {
    if (!selectedTask || !declineReason.trim()) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/decline`, { reason: declineReason });
      setShowDeclineModal(false);
      setDeclineReason('');
      setSelectedTask(null);
      fetchTasks();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi từ chối task');
    }
  };

  // 3. Tích việc con (Subtask toggle)
  const handleToggleSubtask = async (taskId: string, subtaskId: string, isCompleted: boolean) => {
    try {
      await api.patch(`/tasks/subtasks/${subtaskId}/toggle`, { isCompleted });
      // Cập nhật state local ngay để mượt mà
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const newSubtasks = t.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, isCompleted } : s
            );
            const completedCount = newSubtasks.filter((s) => s.isCompleted).length;
            const progress =
              newSubtasks.length > 0
                ? Math.round((completedCount / newSubtasks.length) * 100)
                : t.progress;
            return {
              ...t,
              subtasks: newSubtasks,
              completedSubtasks: completedCount,
              progress,
            };
          }
          return t;
        })
      );

      if (selectedTask && selectedTask.id === taskId) {
        const newSubtasks = selectedTask.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, isCompleted } : s
        );
        const completedCount = newSubtasks.filter((s) => s.isCompleted).length;
        const progress =
          newSubtasks.length > 0
            ? Math.round((completedCount / newSubtasks.length) * 100)
            : selectedTask.progress;
        setSelectedTask({
          ...selectedTask,
          subtasks: newSubtasks,
          completedSubtasks: completedCount,
          progress,
        });
      }
    } catch (error: any) {
      console.error('Lỗi tích việc con', error);
    }
  };

  // 4. Thêm subtask trực tiếp
  const handleAddInlineSubtask = async (taskId: string) => {
    if (!inlineSubtaskTitle.trim()) return;
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks`, { title: inlineSubtaskTitle });
      setInlineSubtaskTitle('');
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask({
          ...selectedTask,
          subtasks: [...selectedTask.subtasks, res.data.subtask],
          totalSubtasks: selectedTask.totalSubtasks + 1,
        });
      }
    } catch (error) {
      console.error('Lỗi thêm subtask', error);
    }
  };

  // 5. Nộp báo cáo nghiệm thu
  const handleSubmitReview = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/submit-review`, { note: completionNote });
      setShowSubmitModal(false);
      setCompletionNote('');
      fetchTasks();
      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          status: 'REVIEW',
          completionReport: completionNote,
          submittedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi nộp báo cáo nghiệm thu');
    }
  };

  // 6. Quản lý duyệt hoặc từ chối nghiệm thu
  const handleReviewAction = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/review`, {
        action: reviewAction,
        feedback: reviewFeedback,
      });
      setShowReviewModal(false);
      setReviewFeedback('');
      fetchTasks();
      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          status: reviewAction === 'APPROVE' ? 'DONE' : 'IN_PROGRESS',
          reviewFeedback,
          reviewedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi duyệt công việc');
    }
  };

  // 7. Xóa task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này không?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Lỗi xóa task', error);
    }
  };

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;

    // Scope filters
    let matchesScope = true;
    if (scopeFilter === 'MY_TASKS') {
      matchesScope = t.assignees?.some((a) => a.id === user?.id) || t.createdBy?.id === user?.id;
    } else if (scopeFilter === 'PENDING_MY_ACCEPT') {
      matchesScope = t.assignees?.some(
        (a) => a.id === user?.id && a.acceptanceStatus === 'PENDING'
      );
    } else if (scopeFilter === 'TODAY') {
      if (!t.dueDate) {
        matchesScope = false;
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        const dueStr = new Date(t.dueDate).toISOString().slice(0, 10);
        matchesScope = dueStr <= todayStr && t.status !== 'DONE';
      }
    } else if (scopeFilter === 'REVIEW') {
      matchesScope = t.status === 'REVIEW';
    }

    return matchesSearch && matchesPriority && matchesStatus && matchesScope;
  });

  // Pagination calculation
  const totalItems = filteredTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            KHẨN CẤP
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            CAO
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            TRUNG BÌNH
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
            THẤP
          </span>
        );
    }
  };

  const columns = [
    {
      id: 'PENDING_ACCEPT',
      label: '1. Chờ Tiếp Nhận',
      color: 'border-purple-500/50',
      badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      desc: 'Task mới giao chưa xác nhận',
    },
    {
      id: 'IN_PROGRESS',
      label: '2. Đang Thực Hiện',
      color: 'border-blue-500/50',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      desc: 'Đang làm & tích việc con',
    },
    {
      id: 'REVIEW',
      label: '3. Chờ Nghiệm Thu',
      color: 'border-amber-500/50',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      desc: 'Đã nộp báo cáo chờ duyệt',
    },
    {
      id: 'DONE',
      label: '4. Đã Hoàn Thành',
      color: 'border-emerald-500/50',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      desc: 'Nghiệm thu hoàn tất 100%',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Quản Lý Công Việc & Tiến Trình
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
            >
              {totalItems} Tasks
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Quy trình tiếp nhận task qua email & web ➔ thực hiện việc con ➔ nộp báo cáo ➔ nghiệm thu hoàn thành
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div
            className={`flex items-center p-1 rounded-2xl border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Bảng Kanban"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Danh Sách"
            >
              <List className="w-3.5 h-3.5" /> Danh Sách
            </button>
          </div>

          {canCreateTask && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Giao Việc Mới
            </button>
          )}
        </div>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setScopeFilter('MY_TASKS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            scopeFilter === 'MY_TASKS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" /> Việc Của Tôi
        </button>

        <button
          onClick={() => setScopeFilter('PENDING_MY_ACCEPT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            scopeFilter === 'PENDING_MY_ACCEPT'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Chờ Tôi Nhận Việc
        </button>

        <button
          onClick={() => setScopeFilter('TODAY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            scopeFilter === 'TODAY'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Hôm Nay / Quá Hạn
        </button>

        <button
          onClick={() => setScopeFilter('REVIEW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            scopeFilter === 'REVIEW'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" /> Chờ Nghiệm Thu ({tasks.filter((t) => t.status === 'REVIEW').length})
        </button>

        <button
          onClick={() => setScopeFilter('ALL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            scopeFilter === 'ALL'
              ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🌐 Toàn Bộ ({tasks.length})
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                : 'bg-slate-900/80 border-slate-700/80 text-white placeholder-slate-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
          >
            <option value="ALL">Mọi mức độ ưu tiên</option>
            <option value="URGENT">Khẩn cấp</option>
            <option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="PENDING_ACCEPT">Chờ tiếp nhận</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="REVIEW">Chờ nghiệm thu</option>
            <option value="DONE">Đã hoàn thành</option>
          </select>

          <div className={`flex items-center gap-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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
              <option value={8}>8 việc</option>
              <option value={12}>12 việc</option>
              <option value={24}>24 việc</option>
              <option value={48}>48 việc</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Đang tải danh sách công việc...
            </p>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div
          className={`text-center py-16 rounded-3xl border space-y-4 shadow-xl ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}
        >
          <CheckSquare className={`w-12 h-12 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
          <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Không tìm thấy công việc nào phù hợp
          </h3>
          <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {canCreateTask
              ? 'Hãy thử thay đổi bộ lọc hoặc bấm "Giao Việc Mới" để tạo nhiệm vụ đầu tiên.'
              : 'Hiện tại bạn chưa có công việc nào cần xử lý trong danh mục này.'}
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterPriority('ALL');
              setFilterStatus('ALL');
              setScopeFilter('ALL');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`rounded-3xl border p-4 sm:p-5 flex flex-col min-h-[500px] shadow-xl space-y-4 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'glass-panel border-white/[0.08]'
                }`}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div>
                    <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{col.label}</h3>
                    <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{col.desc}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in this column */}
                <div className="space-y-3.5 flex-1">
                  {colTasks.map((t) => {
                    const isMyAssigned = t.assignees?.some((a) => a.id === user?.id);
                    const myAssigneeObj = t.assignees?.find((a) => a.id === user?.id);
                    const isPendingMyAccept = myAssigneeObj?.acceptanceStatus === 'PENDING';

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md space-y-3 group ${
                          isLight
                            ? 'bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-300'
                            : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-blue-500/40'
                        }`}
                      >
                        {/* Title & Priority */}
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`font-bold text-sm transition line-clamp-2 ${
                              isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'
                            }`}
                          >
                            {t.title}
                          </h4>
                          {getPriorityBadge(t.priority)}
                        </div>

                        {t.description && (
                          <p className={`text-xs line-clamp-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.description}</p>
                        )}

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className={`flex justify-between text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            <span>Việc con: {t.completedSubtasks}/{t.totalSubtasks}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{t.progress}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Quick Action Button for Member if Pending */}
                        {isPendingMyAccept && (
                          <div className={`pt-2 border-t flex items-center gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptTask(t.id);
                              }}
                              className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Tiếp nhận task
                            </button>
                          </div>
                        )}

                        {/* Quick Action Button if In Progress -> Submit Review */}
                        {t.status === 'IN_PROGRESS' && isMyAssigned && (
                          <div className={`pt-2 border-t flex items-center gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t);
                                setShowSubmitModal(true);
                              }}
                              className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" /> Nộp báo cáo duyệt
                            </button>
                          </div>
                        )}

                        {/* Quick Action for Admin if Review */}
                        {t.status === 'REVIEW' && isAdminOrManager && (
                          <div className={`pt-2 border-t flex items-center gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t);
                                setReviewAction('APPROVE');
                                setShowReviewModal(true);
                              }}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold shadow-sm transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t);
                                setReviewAction('REJECT');
                                setShowReviewModal(true);
                              }}
                              className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-[11px] font-bold transition cursor-pointer"
                            >
                              Làm lại
                            </button>
                          </div>
                        )}

                        {/* Assignees and Due Date footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                          <div className="flex items-center -space-x-1.5">
                            {t.assignees?.map((a) => (
                              <div
                                key={a.id}
                                title={`${a.name} (${a.acceptanceStatus === 'ACCEPTED' ? 'Đã nhận' : 'Chưa nhận'})`}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-900 ${
                                  a.acceptanceStatus === 'ACCEPTED' ? 'bg-blue-600' : 'bg-purple-600'
                                }`}
                              >
                                {a.name.slice(0, 1).toUpperCase()}
                              </div>
                            ))}
                          </div>

                          {t.dueDate && (
                            <span className="flex items-center gap-1 text-slate-400 font-medium">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW WITH PAGINATION */
        <div className={`rounded-3xl border shadow-xl overflow-hidden ${isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'}`}>
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'}`}>
                <tr>
                  <th className="py-3.5 px-4">Tên Công Việc</th>
                  <th className="py-3.5 px-4">Mức Độ</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Tiến Độ</th>
                  <th className="py-3.5 px-4">Người Thực Hiện</th>
                  <th className="py-3.5 px-4">Hạn Chót</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/80 text-slate-300'}`}>
                {paginatedTasks.map((t) => {
                  const isPendingMyAccept = t.assignees?.some(
                    (a) => a.id === user?.id && a.acceptanceStatus === 'PENDING'
                  );
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`transition cursor-pointer group ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className={`font-bold transition text-sm ${isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'}`}>
                            {t.title}
                          </span>
                          {t.description && (
                            <p className={`text-xs line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            t.status === 'DONE'
                              ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : t.status === 'IN_PROGRESS'
                              ? isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : t.status === 'REVIEW'
                              ? isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : isLight ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {t.status === 'DONE'
                            ? 'Hoàn thành'
                            : t.status === 'IN_PROGRESS'
                            ? 'Đang làm'
                            : t.status === 'REVIEW'
                            ? 'Chờ duyệt'
                            : 'Chờ nhận'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className={`flex justify-between text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span>{t.completedSubtasks}/{t.totalSubtasks} việc</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{t.progress}%</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-1.5">
                          {t.assignees?.map((a) => (
                            <div
                              key={a.id}
                              title={`${a.name} (${a.acceptanceStatus === 'ACCEPTED' ? 'Đã nhận' : 'Chưa nhận'})`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 ${
                                isLight ? 'border-white' : 'border-slate-900'
                              } ${
                                a.acceptanceStatus === 'ACCEPTED' ? 'bg-blue-600' : 'bg-purple-600'
                              }`}
                            >
                              {a.name.slice(0, 1).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {t.dueDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingMyAccept && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptTask(t.id);
                              }}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Nhận việc
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedTask(t)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isLight ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
                            }`}
                            title="Xem chi tiết"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalItems > pageSize && (
            <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'}`}>
              <div>
                Hiển thị <strong className={isLight ? 'text-slate-900' : 'text-white'}>{startIndex + 1}</strong> - <strong className={isLight ? 'text-slate-900' : 'text-white'}>{endIndex}</strong> / <strong className="text-blue-600 dark:text-blue-400">{totalItems}</strong> công việc
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
      )}

      {/* MODAL CHI TIẾT CÔNG VIỆC */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Chi Tiết Công Việc & Tiến Độ"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* Header info */}
            <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {selectedTask.title}
                  </h3>
                  {getPriorityBadge(selectedTask.priority)}
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Tạo bởi <strong className={isLight ? 'text-slate-800 font-bold' : 'text-slate-200'}>{selectedTask.createdBy?.name}</strong> • Hạn chót:{' '}
                  <span className="font-semibold">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('vi-VN') : 'Không giới hạn'}</span>
                </p>
              </div>

              {/* Status pill */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold self-start shadow-sm border ${
                  selectedTask.status === 'DONE'
                    ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : selectedTask.status === 'IN_PROGRESS'
                    ? isLight ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : selectedTask.status === 'REVIEW'
                    ? isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                }`}
              >
                {selectedTask.status === 'DONE'
                  ? 'Đã Hoàn Thành 100%'
                  : selectedTask.status === 'IN_PROGRESS'
                  ? 'Đang Thực Hiện'
                  : selectedTask.status === 'REVIEW'
                  ? 'Chờ Nghiệm Thu'
                  : 'Chờ Tiếp Nhận'}
              </span>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700 shadow-inner' : 'bg-slate-800/50 border-slate-700/60 text-slate-200'
              }`}>
                {selectedTask.description}
              </div>
            )}

            {/* Assignee status */}
            <div>
              <h4 className={`text-xs font-extrabold uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Người thực hiện ({selectedTask.assignees?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTask.assignees?.map((a) => (
                  <div
                    key={a.id}
                    className={`p-2 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition ${
                      isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-800/80 border-slate-700 text-white'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>{a.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        a.acceptanceStatus === 'ACCEPTED'
                          ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : a.acceptanceStatus === 'DECLINED'
                          ? isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      }`}
                    >
                      {a.acceptanceStatus === 'ACCEPTED'
                        ? 'Đã nhận'
                        : a.acceptanceStatus === 'DECLINED'
                        ? 'Từ chối'
                        : 'Chờ nhận'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Checklist Việc Con ({selectedTask.completedSubtasks}/{selectedTask.totalSubtasks}) - {selectedTask.progress}%
                </h4>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${selectedTask.progress}%` }}
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedTask.subtasks?.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtask(selectedTask.id, st.id, !st.isCompleted)}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition cursor-pointer ${
                      st.isCompleted
                        ? isLight
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                          : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : isLight
                        ? 'bg-white border-slate-200 text-slate-800 hover:border-blue-400 shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/70 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                        st.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : isLight
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {st.isCompleted && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-medium flex-1 ${st.isCompleted ? 'line-through opacity-70' : ''}`}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add subtask inline */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Thêm đầu việc con mới..."
                  value={inlineSubtaskTitle}
                  onChange={(e) => setInlineSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInlineSubtask(selectedTask.id);
                    }
                  }}
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100'
                      : 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleAddInlineSubtask(selectedTask.id)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  + Thêm việc
                </button>
              </div>
            </div>

            {/* Completion Report Section */}
            {selectedTask.completionReport && (
              <div className={`p-4 rounded-2xl border space-y-2 ${
                isLight ? 'bg-blue-50/80 border-blue-200 text-slate-800' : 'bg-indigo-950/40 border-indigo-500/30 text-slate-200'
              }`}>
                <h5 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-blue-700' : 'text-indigo-400'}`}>
                  <FileCheck className="w-4 h-4" /> Báo Cáo Nghiệm Thu Của Nhân Viên
                </h5>
                <p className={`text-xs whitespace-pre-wrap ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{selectedTask.completionReport}</p>
                {selectedTask.reviewFeedback && (
                  <div className={`mt-2 pt-2 border-t text-xs font-medium ${isLight ? 'border-blue-200 text-amber-800' : 'border-indigo-500/20 text-amber-300'}`}>
                    <strong>Nhận xét của Quản lý:</strong> {selectedTask.reviewFeedback}
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className={`pt-4 border-t flex items-center justify-between flex-wrap gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              {(isAdminOrManager || user?.role === 'SECRETARY') ? (
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 shadow-sm'
                      : 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Xóa Task
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 ml-auto">
                {/* Accept/Decline button for pending assignee */}
                {selectedTask.assignees?.some((a) => a.id === user?.id && a.acceptanceStatus === 'PENDING') && (
                  <>
                    <button
                      onClick={() => setShowDeclineModal(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isLight ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white'
                      }`}
                    >
                      Từ Chối
                    </button>
                    <button
                      onClick={() => handleAcceptTask(selectedTask.id)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Tiếp Nhận Task
                    </button>
                  </>
                )}

                {/* Submit review button for in-progress member */}
                {selectedTask.status === 'IN_PROGRESS' &&
                  selectedTask.assignees?.some((a) => a.id === user?.id) && (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Nộp Báo Cáo Nghiệm Thu
                    </button>
                  )}

                {/* Approve/Reject button for Manager/Secretary/Admin when status is REVIEW */}
                {selectedTask.status === 'REVIEW' && (isAdminOrManager || user?.role === 'SECRETARY') && (
                  <>
                    <button
                      onClick={() => {
                        setReviewAction('REJECT');
                        setShowReviewModal(true);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isLight ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white'
                      }`}
                    >
                      Yêu Cầu Làm Lại
                    </button>
                    <button
                      onClick={() => {
                        setReviewAction('APPROVE');
                        setShowReviewModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Duyệt Nghiệm Thu Hoàn Thành
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Nộp Báo Cáo Nghiệm Thu */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Nộp Báo Cáo Nghiệm Thu Công Việc"
      >
        <div className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Hãy nhập tóm tắt kết quả, link Google Drive, Github hoặc tài liệu hoàn thành để Quản trị viên duyệt:
          </p>
          <textarea
            rows={4}
            placeholder="VD: Đã hoàn thành các hạng mục theo checklist. Link kết quả: https://..."
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
              isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100' : 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
            }`}
          />
          <div className={`flex justify-end gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => setShowSubmitModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              onClick={handleSubmitReview}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              🚀 Gửi Báo Cáo Duyệt
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Duyệt Nghiệm Thu (Approve/Reject) */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={reviewAction === 'APPROVE' ? 'Duyệt Nghiệm Thu Công Việc' : 'Yêu Cầu Nhân Viên Làm Lại'}
      >
        <div className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {reviewAction === 'APPROVE'
              ? 'Công việc sẽ được chuyển sang trạng thái HOÀN THÀNH 100% và gửi thông báo chúc mừng đến nhân viên.'
              : 'Hãy nhập lý do hoặc các điểm cần khắc phục để nhân viên tiến hành sửa đổi:'}
          </p>
          <textarea
            rows={3}
            placeholder={
              reviewAction === 'APPROVE'
                ? 'Nhận xét thêm (ví dụ: Làm rất tốt, thưởng tiến độ...)'
                : 'Lý do yêu cầu làm lại...'
            }
            value={reviewFeedback}
            onChange={(e) => setReviewFeedback(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
              isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100' : 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
            }`}
          />
          <div className={`flex justify-end gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => setShowReviewModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              onClick={handleReviewAction}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
                reviewAction === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              }`}
            >
              {reviewAction === 'APPROVE' ? '✅ Xác Nhận Duyệt Hoàn Tất' : '🔄 Gửi Yêu Cầu Sửa Đổi'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Từ Chối Task */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        title="Từ Chối Nhận Công Việc"
      >
        <div className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Vui lòng nhập lý do từ chối để Người giao việc nắm được thông tin và phân công lại:
          </p>
          <textarea
            rows={3}
            required
            placeholder="VD: Trùng lịch dự án gấp, quá tải công việc..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-rose-500 transition ${
              isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-rose-100' : 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500'
            }`}
          />
          <div className={`flex justify-end gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => setShowDeclineModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              onClick={handleDeclineTask}
              disabled={!declineReason.trim()}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer"
            >
              Xác Nhận Từ Chối
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Tạo Task Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Giao Công Việc Mới (Gửi Email & Chuông Web)"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tên Công Việc Cha <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Thiết kế banner chương trình khuyến mãi tháng này"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-blue-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Mô Tả Yêu Cầu Chi Tiết
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả mục tiêu, yêu cầu nghiệm thu và tài liệu đính kèm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
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
                onChange={(e) => setPriority(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold border focus:outline-none focus:border-blue-500 transition cursor-pointer ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              >
                <option value="LOW">🔵 Thấp</option>
                <option value="MEDIUM">🟡 Trung bình</option>
                <option value="HIGH">🟠 Cao</option>
                <option value="URGENT">🔴 Khẩn cấp</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Hạn Chót (Deadline)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          {/* Phân công thành viên */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Phân Công Cho Thành Viên (Tự động nhận Email & Chuông Web)
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              {members.map((m) => {
                const isSelected = selectedAssigneeIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedAssigneeIds(selectedAssigneeIds.filter((id) => id !== m.id));
                      } else {
                        setSelectedAssigneeIds([...selectedAssigneeIds, m.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    <UserIcon className="w-3 h-3" />
                    {m.name} ({m.email})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist việc con ban đầu */}
          <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <label className={`block text-xs font-bold mb-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              Checklist Các Việc Con (Subtasks)
            </label>
            <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
              {initialSubtasks.map((st, idx) => (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700'}`}>
                  <span className={`text-xs font-bold w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}.</span>
                  <span className={`text-xs flex-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>{st.title}</span>
                  <button
                    type="button"
                    onClick={() => setInitialSubtasks(initialSubtasks.filter((_, i) => i !== idx))}
                    className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Thêm đầu việc con cụ thể..."
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubtaskInput.trim()) {
                      setInitialSubtasks([...initialSubtasks, { title: newSubtaskInput.trim() }]);
                      setNewSubtaskInput('');
                    }
                  }
                }}
                className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  if (newSubtaskInput.trim()) {
                    setInitialSubtasks([...initialSubtasks, { title: newSubtaskInput.trim() }]);
                    setNewSubtaskInput('');
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                + Thêm
              </button>
            </div>
          </div>

          <div className={`pt-4 border-t flex justify-end gap-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Giao Việc & Gửi Thông Báo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
