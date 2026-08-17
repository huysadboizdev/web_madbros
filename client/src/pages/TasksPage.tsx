import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List,
  AlertCircle,
  User as UserIcon,
  ChevronRight,
  Send,
  ThumbsUp,
  RotateCcw,
  Check,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  assignedTo?: { id: string; name: string } | null;
  dueDate?: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  progress: number;
  totalSubtasks: number;
  completedSubtasks: number;
  completionNote?: string | null;
  reviewFeedback?: string | null;
  createdById: string;
  subtasks: Subtask[];
  assignees: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    acceptanceStatus: string;
    acceptedAt?: string | null;
    declinedReason?: string | null;
  }[];
  createdBy: { id: string; name: string };
  createdAt: string;
}

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Workspace members
  const [members, setMembers] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

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
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
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
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/decline`, {
        reason: declineReason,
      });
      setShowDeclineModal(false);
      setDeclineReason('');
      fetchTasks();
      setSelectedTask(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi từ chối task');
    }
  };

  // 3. Gửi Báo Cáo Nghiệm Thu
  const handleSubmitReview = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/submit-review`, {
        completionNote,
      });
      setShowSubmitModal(false);
      setCompletionNote('');
      fetchTasks();
      setSelectedTask({
        ...selectedTask,
        status: 'REVIEW',
        completionNote,
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi gửi duyệt task');
    }
  };

  // 4. Duyệt hoặc Yêu Cầu Làm Lại
  const handleReviewTask = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask.id}/review`, {
        action: reviewAction,
        feedback: reviewFeedback,
      });
      setShowReviewModal(false);
      setReviewFeedback('');
      fetchTasks();
      setSelectedTask({
        ...selectedTask,
        status: reviewAction === 'APPROVE' ? 'DONE' : 'IN_PROGRESS',
        reviewFeedback,
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi đánh giá task');
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    try {
      await api.patch(`/tasks/subtasks/${subtaskId}/toggle`, {
        isCompleted: !currentCompleted,
      });

      setTasks((prev) =>
        prev.map((t) => {
          const sub = t.subtasks.find((s) => s.id === subtaskId);
          if (sub) {
            const updatedSubtasks = t.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, isCompleted: !currentCompleted } : s
            );
            const total = updatedSubtasks.length;
            const completed = updatedSubtasks.filter((s) => s.isCompleted).length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { ...t, subtasks: updatedSubtasks, progress, completedSubtasks: completed };
          }
          return t;
        })
      );

      if (selectedTask) {
        const updatedSubtasks = selectedTask.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, isCompleted: !currentCompleted } : s
        );
        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter((s) => s.isCompleted).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks, progress, completedSubtasks: completed });
      }
    } catch (error) {
      console.error('Lỗi toggle subtask', error);
    }
  };

  const handleAddInlineSubtask = async (taskId: string) => {
    if (!inlineSubtaskTitle.trim()) return;
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks`, {
        title: inlineSubtaskTitle.trim(),
      });
      const newSub = res.data.subtask;

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const updatedSubtasks = [...t.subtasks, newSub];
            const total = updatedSubtasks.length;
            const completed = updatedSubtasks.filter((s) => s.isCompleted).length;
            const progress = Math.round((completed / total) * 100);
            return { ...t, subtasks: updatedSubtasks, totalSubtasks: total, progress };
          }
          return t;
        })
      );

      if (selectedTask && selectedTask.id === taskId) {
        const updatedSubtasks = [...selectedTask.subtasks, newSub];
        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter((s) => s.isCompleted).length;
        const progress = Math.round((completed / total) * 100);
        setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks, totalSubtasks: total, progress });
      }

      setInlineSubtaskTitle('');
    } catch (error) {
      console.error('Lỗi thêm subtask', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, taskId: string) => {
    try {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const updatedSubtasks = t.subtasks.filter((s) => s.id !== subtaskId);
            const total = updatedSubtasks.length;
            const completed = updatedSubtasks.filter((s) => s.isCompleted).length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : (t.status === 'DONE' ? 100 : 0);
            return { ...t, subtasks: updatedSubtasks, totalSubtasks: total, progress, completedSubtasks: completed };
          }
          return t;
        })
      );

      if (selectedTask) {
        const updatedSubtasks = selectedTask.subtasks.filter((s) => s.id !== subtaskId);
        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter((s) => s.isCompleted).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks, totalSubtasks: total, progress, completedSubtasks: completed });
      }
    } catch (error) {
      console.error('Lỗi xóa subtask', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTask?.id === id) setSelectedTask(null);
    } catch (error) {
      console.error('Lỗi xóa task', error);
    }
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">KHẨN CẤP</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">CAO</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">TRUNG BÌNH</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">THẤP</span>;
    }
  };

  const columns = [
    { id: 'PENDING_ACCEPT', label: '1. Chờ Tiếp Nhận', color: 'border-purple-500/50', badge: 'bg-purple-500/10 text-purple-400' },
    { id: 'IN_PROGRESS', label: '2. Đang Thực Hiện', color: 'border-blue-500/50', badge: 'bg-blue-500/10 text-blue-400' },
    { id: 'REVIEW', label: '3. Chờ Nghiệm Thu', color: 'border-amber-500/50', badge: 'bg-amber-500/10 text-amber-400' },
    { id: 'DONE', label: '4. Đã Hoàn Thành', color: 'border-emerald-500/50', badge: 'bg-emerald-500/10 text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Quản Lý Công Việc & Tiến Trình
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Quy trình tiếp nhận task qua email & web ➔ thực hiện việc con ➔ nộp báo cáo ➔ nghiệm thu hoàn thành
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Bảng Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Danh Sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" /> Giao Việc Mới
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm kiếm công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="URGENT">Khẩn cấp</option>
            <option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>

          {viewMode === 'list' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_ACCEPT">Chờ tiếp nhận</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="REVIEW">Chờ duyệt</option>
              <option value="DONE">Hoàn thành</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content: Kanban or List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-3 min-h-[420px]"
              >
                <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                    {col.label}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.map((t) => {
                    const myAssignee = t.assignees.find((a) => a.id === user?.id);
                    const isPendingMyAccept = myAssignee && myAssignee.acceptanceStatus === 'PENDING';

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={`p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border transition-all cursor-pointer space-y-3 group relative ${
                          isPendingMyAccept
                            ? 'border-purple-500/60 ring-1 ring-purple-500/30'
                            : 'border-slate-700/60 hover:border-blue-500/50'
                        }`}
                      >
                        {/* Urgent tag or Acceptance Call */}
                        {isPendingMyAccept && (
                          <div className="flex items-center justify-between bg-purple-500/15 text-purple-300 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-purple-500/30">
                            <span className="flex items-center gap-1 animate-pulse">
                              <Sparkles className="w-3 h-3" /> Cần bạn tiếp nhận
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptTask(t.id);
                              }}
                              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold"
                            >
                              Nhận ngay
                            </button>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          {getPriorityBadge(t.priority)}
                          {t.dueDate && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition">
                          {t.title}
                        </h4>

                        {t.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
                        )}

                        {/* Subtasks progress */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 font-medium">
                              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                              {t.completedSubtasks}/{t.totalSubtasks} việc con
                            </span>
                            <span className="font-bold text-blue-400">{t.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer: Assignees & Created By */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {t.assignees.map((a, i) => (
                              <div
                                key={i}
                                title={`${a.name} (${a.acceptanceStatus === 'ACCEPTED' ? 'Đã nhận task' : 'Chờ nhận'})`}
                                className={`w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-slate-800 ${
                                  a.acceptanceStatus === 'ACCEPTED' ? 'bg-emerald-600' : 'bg-purple-600'
                                }`}
                              >
                                {a.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500">giao bởi {t.createdBy.name}</span>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-600">
                      Không có công việc
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="divide-y divide-slate-800">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                className="p-4 sm:p-5 hover:bg-slate-800/50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(t.priority)}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'PENDING_ACCEPT'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : t.status === 'REVIEW'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {t.status === 'PENDING_ACCEPT'
                        ? 'Chờ tiếp nhận'
                        : t.status === 'IN_PROGRESS'
                        ? 'Đang làm'
                        : t.status === 'REVIEW'
                        ? 'Chờ duyệt'
                        : 'Hoàn thành'}
                    </span>
                    <span className="font-bold text-sm text-slate-100">{t.title}</span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">{t.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-6 sm:justify-end">
                  <div className="w-36 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{t.completedSubtasks}/{t.totalSubtasks} việc con</span>
                      <span className="font-bold text-blue-400">{t.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tạo Task Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Giao Công Việc Mới (Gửi Email & Chuông Web)"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tên Công Việc Cha <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Viết tài liệu kỹ thuật & Triển khai hệ thống"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mô Tả Yêu Cầu Chi Tiết
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả mục tiêu, yêu cầu nghiệm thu và tài liệu đính kèm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mức Độ Ưu Tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">🚨 Khẩn cấp</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hạn Chót (Deadline)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Phân công thành viên */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Phân Công Cho Thành Viên (Sẽ tự động nhận Email & Chuông Web)
            </label>
            <div className="flex flex-wrap gap-2">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
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
          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-200 mb-2">
              Checklist Các Việc Con (Subtasks)
            </label>
            <div className="space-y-2 mb-3">
              {initialSubtasks.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800/40 p-2 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold w-5">{idx + 1}.</span>
                  <span className="text-xs text-white flex-1">{st.title}</span>
                  <button
                    type="button"
                    onClick={() => setInitialSubtasks(initialSubtasks.filter((_, i) => i !== idx))}
                    className="p-1 text-slate-500 hover:text-rose-400"
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
                className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSubtaskInput.trim()) {
                    setInitialSubtasks([...initialSubtasks, { title: newSubtaskInput.trim() }]);
                    setNewSubtaskInput('');
                  }
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                + Thêm
              </button>
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Giao Việc & Gửi Thông Báo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chi Tiết Task & Tiến Trình */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Chi Tiết Công Việc & Tiến Trình"
        >
          <div className="space-y-5">
            {/* Banner Tiếp Nhận Task dành cho nhân viên được giao */}
            {(() => {
              const myAssignee = selectedTask.assignees.find((a) => a.id === user?.id);
              if (myAssignee && myAssignee.acceptanceStatus === 'PENDING') {
                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/40 space-y-3">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Bạn được giao công việc này! Hãy tiếp nhận để bắt đầu làm.
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAcceptTask(selectedTask.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Tiếp Nhận Task Ngay
                      </button>
                      <button
                        onClick={() => setShowDeclineModal(true)}
                        className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Từ Chối
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(selectedTask.priority)}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedTask.status === 'PENDING_ACCEPT'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : selectedTask.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : selectedTask.status === 'REVIEW'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {selectedTask.status === 'PENDING_ACCEPT'
                      ? 'Chờ tiếp nhận'
                      : selectedTask.status === 'IN_PROGRESS'
                      ? 'Đang làm'
                      : selectedTask.status === 'REVIEW'
                      ? 'Chờ nghiệm thu'
                      : 'Đã hoàn thành'}
                  </span>
                </div>

                {(selectedTask.createdById === user?.id || user?.role === 'ADMIN') && (
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                    title="Xóa task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="text-lg font-bold text-white">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              )}
            </div>

            {/* Completion Note & Review Feedback Display */}
            {selectedTask.completionNote && (
              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-1">
                <span className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Báo cáo kết quả của nhân viên:
                </span>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedTask.completionNote}</p>
              </div>
            )}

            {selectedTask.reviewFeedback && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Nhận xét từ người duyệt:
                </span>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedTask.reviewFeedback}</p>
              </div>
            )}

            {/* Progress calculation */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">
                  Tiến độ ({selectedTask.completedSubtasks}/{selectedTask.totalSubtasks} việc con hoàn thành)
                </span>
                <span className="font-extrabold text-blue-400 text-sm">
                  {selectedTask.progress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${selectedTask.progress}%` }}
                />
              </div>
            </div>

            {/* Subtasks Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Checklist Công Việc Con (Subtasks)
              </h4>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedTask.subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 transition group"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => handleToggleSubtask(st.id, st.isCompleted)}
                    >
                      {st.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0 group-hover:text-blue-400" />
                      )}
                      <span
                        className={`text-xs ${
                          st.isCompleted
                            ? 'line-through text-slate-500 font-medium'
                            : 'text-slate-200 font-medium'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteSubtask(st.id, selectedTask.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Xóa việc con"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {selectedTask.subtasks.length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-500">
                    Chưa có việc con nào. Hãy thêm các đầu việc cụ thể bên dưới.
                  </p>
                )}
              </div>

              {/* Add inline subtask form */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Thêm việc con mới..."
                  value={inlineSubtaskTitle}
                  onChange={(e) => setInlineSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInlineSubtask(selectedTask.id);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddInlineSubtask(selectedTask.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                >
                  + Thêm
                </button>
              </div>
            </div>

            {/* Action Bar: Submit for Review OR Review by Boss */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {/* Nhân viên nộp duyệt */}
              {selectedTask.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Nộp Báo Cáo / Gửi Duyệt Task
                </button>
              )}

              {/* Sếp hoặc Admin duyệt task khi ở trạng thái REVIEW */}
              {selectedTask.status === 'REVIEW' &&
                (selectedTask.createdById === user?.id || user?.role === 'ADMIN') && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReviewAction('APPROVE');
                        setShowReviewModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                    >
                      <ThumbsUp className="w-4 h-4" /> Duyệt Hoàn Thành
                    </button>
                    <button
                      onClick={() => {
                        setReviewAction('REJECT');
                        setShowReviewModal(true);
                      }}
                      className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" /> Yêu Cầu Chỉnh Sửa
                    </button>
                  </div>
                )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Nộp Báo Cáo / Yêu Cầu Nghiệm Thu */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Nộp Báo Cáo Hoàn Thành Task"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Hãy nhập tóm tắt kết quả, đính kèm link tài liệu (Google Drive, Github, Figma...) để người giao việc tiến hành kiểm tra và duyệt nghiệm thu:
          </p>
          <textarea
            rows={4}
            required
            placeholder="VD: Đã hoàn tất các đầu việc con. Link kết quả: https://..."
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmitReview}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Gửi Duyệt Ngay
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Đánh Giá / Duyệt Task */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={reviewAction === 'APPROVE' ? 'Duyệt Nghiệm Thu Task' : 'Yêu Cầu Chỉnh Sửa / Làm Lại'}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            {reviewAction === 'APPROVE'
              ? 'Xác nhận công việc đã đạt chuẩn chất lượng và đóng task hoàn tất 100%:'
              : 'Nhập nhận xét chi tiết các điểm chưa đạt để nhân viên tiếp tục chỉnh sửa:'}
          </p>
          <textarea
            rows={3}
            placeholder={
              reviewAction === 'APPROVE'
                ? 'Nhận xét (Tùy chọn): Làm việc rất tốt!'
                : 'Nhận xét bắt buộc: Cần bổ sung thêm...'
            }
            value={reviewFeedback}
            onChange={(e) => setReviewFeedback(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              onClick={handleReviewTask}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg transition ${
                reviewAction === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              }`}
            >
              {reviewAction === 'APPROVE' ? 'Xác Nhận Duyệt' : 'Gửi Yêu Cầu Sửa'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Từ Chối Task */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        title="Từ Chối Tiếp Nhận Task"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Vui lòng nêu lý do bạn không thể nhận công việc này để người giao việc sắp xếp nhân sự khác:
          </p>
          <textarea
            rows={3}
            required
            placeholder="VD: Trùng lịch dự án gấp khác / Không đúng chuyên môn..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowDeclineModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Hủy
            </button>
            <button
              onClick={handleDeclineTask}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition"
            >
              Xác Nhận Từ Chối
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
