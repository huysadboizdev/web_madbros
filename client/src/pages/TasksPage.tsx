import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { Modal } from '../components/Modal';
import { TelegramTagPicker } from '../components/TelegramTagPicker';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
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
  Trash2,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  UserCheck,
  Pencil,
  AlertTriangle,
  Upload,
  Paperclip,
  Download,
  Image as ImageIcon,
  History,
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

interface TaskAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface TaskSubmission {
  id: string;
  note?: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'FAILED';
  feedback?: string;
  createdAt: string;
  reviewedAt?: string;
  submittedBy: { id: string; name: string; avatar?: string };
  reviewedBy?: { id: string; name: string };
  attachments: TaskAttachment[];
}

interface TaskActivity {
  id: string;
  type: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  createdAt: string;
  actor?: { id: string; name: string };
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING_ACCEPT' | 'IN_PROGRESS' | 'DONE';
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
  submissions?: TaskSubmission[];
  activities?: TaskActivity[];
  createdBy: { id: string; name: string };
  createdAt: string;
}

const TASK_STATUS_OPTIONS: Array<{
  value: TaskItem['status'];
  label: string;
  hint: string;
  dotClass: string;
}> = [
  { value: 'PENDING_ACCEPT', label: 'Chờ nhận việc', hint: 'Đưa việc về bảng chờ nhận', dotClass: 'bg-violet-500' },
  { value: 'IN_PROGRESS', label: 'Đang làm', hint: 'Công việc đang được thực hiện', dotClass: 'bg-blue-500' },
  { value: 'DONE', label: 'Hoàn thành', hint: 'Nộp kết quả và hoàn tất', dotClass: 'bg-emerald-500' },
];

const TASK_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp', dotClass: 'bg-sky-500' },
  { value: 'MEDIUM', label: 'Trung bình', dotClass: 'bg-amber-400' },
  { value: 'HIGH', label: 'Cao', dotClass: 'bg-orange-500' },
  { value: 'URGENT', label: 'Khẩn cấp', dotClass: 'bg-rose-500' },
];

const StatusPicker: React.FC<{
  status: TaskItem['status'];
  disabled?: boolean;
  isLight: boolean;
  onChange: (status: TaskItem['status']) => void;
}> = ({ status, disabled = false, isLight, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 260, mobile: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = TASK_STATUS_OPTIONS.find((option) => option.value === status)!;

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mobile = window.innerWidth < 640;
    const width = mobile ? Math.min(360, window.innerWidth - 24) : Math.max(260, rect.width);
    const left = mobile
      ? Math.max(12, (window.innerWidth - width) / 2)
      : Math.min(rect.left, window.innerWidth - width - 12);
    setPosition({ top: rect.bottom + 6, left, width, mobile });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const closeOnOutside = (event: MouseEvent) => {
      const node = event.target as Node;
      if (!buttonRef.current?.contains(node) && !menuRef.current?.contains(node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const reposition = () => updatePosition();

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isOpen]);

  const buttonClass = status === 'DONE'
    ? isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
    : status === 'IN_PROGRESS'
    ? isLight ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' : 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
    : isLight ? 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100' : 'bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) {
            updatePosition();
            setIsOpen((open) => !open);
          }
        }}
        className={`w-full min-w-[150px] inline-flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-extrabold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${buttonClass}`}
      >
        <span className="inline-flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${current.dotClass}`} />
          {current.label}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          {position.mobile && <button type="button" aria-label="Đóng menu trạng thái" className="fixed inset-0 z-[90] bg-slate-950/35 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />}
          <div
            ref={menuRef}
            role="listbox"
            className={`fixed z-[100] p-2 rounded-2xl border shadow-2xl ${isLight ? 'bg-white border-slate-200 shadow-slate-900/15' : 'bg-slate-900 border-slate-700 shadow-black/50'}`}
            style={position.mobile
              ? { left: position.left, bottom: 12, width: position.width }
              : { left: position.left, top: position.top, width: position.width }}
          >
            <div className={`px-2.5 pt-1 pb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              Cập nhật trạng thái
            </div>
            {TASK_STATUS_OPTIONS.map((option) => {
              const selected = option.value === status;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setIsOpen(false);
                    if (!selected) onChange(option.value);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${selected
                    ? isLight ? 'bg-slate-100' : 'bg-slate-800'
                    : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/70'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${option.dotClass}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>{option.label}</span>
                    <span className={`block mt-0.5 text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{option.hint}</span>
                  </span>
                  {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const LocalImagePreview: React.FC<{ file: File }> = ({ file }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url ? <img src={url} alt={file.name} className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-700" /> : null;
};

// Các state deadline cũ chỉ còn phục vụ tương thích mã form đã ẩn; API không còn nhận deadline.
const validateHiddenDeadline = (_date: string, _time: string): string | null => null;

const ProtectedImagePreview: React.FC<{ attachment: TaskAttachment; onOpen: () => void }> = ({ attachment, onOpen }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    api.get(`/tasks/attachments/${attachment.id}/download`, { responseType: 'blob' })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        if (active) setUrl(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id]);

  return (
    <button type="button" onClick={onOpen} className="w-full h-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer">
      {url ? <img src={url} alt={attachment.originalName} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 mx-auto text-slate-400" />}
    </button>
  );
};

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');

  // Role Scope & Filter
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canCreateTask = user?.role === 'ADMIN' || user?.role === 'SECRETARY' || user?.role === 'MANAGER';
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MY_TASKS' | 'OPEN'>(
    'ALL'
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
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Decline Modal
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Form states for create task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDateDate, setDueDateDate] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [telegramTag, setTelegramTag] = useState('');
  const [initialSubtasks, setInitialSubtasks] = useState<{ title: string }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Inline subtask input
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState('');

  // Edit Task modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editDueDateDate, setEditDueDateDate] = useState('');
  const [editDueDateTime, setEditDueDateTime] = useState('');
  const [editDeadlineError, setEditDeadlineError] = useState<string | null>(null);
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Custom Delete Confirm modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

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
        title: title.trim(),
        description: description.trim(),
        priority,
        telegramTag: telegramTag.trim(),
        assigneeIds: [],
        subtasks: initialSubtasks.filter((s) => s.title.trim().length > 0),
        sendEmail: true,
      });

      // Reset
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setTelegramTag('');
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

  const handleClaimTask = async (taskId: string) => {
    try {
      await api.post(`/tasks/${taskId}/claim`);
      await fetchTasks();
      if (selectedTask?.id === taskId) {
        const detail = await api.get(`/tasks/${taskId}`);
        setSelectedTask(detail.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể nhận công việc');
      fetchTasks();
    }
  };

  const openCompletionForm = (task: TaskItem) => {
    setSelectedTask(task);
    setCompletionNote('');
    setSubmissionFiles([]);
    setSubmitError('');
    setShowSubmitModal(true);
  };

  const handleInlineStatusChange = async (task: TaskItem, nextStatus: TaskItem['status']) => {
    if (nextStatus === task.status) return;
    if (nextStatus === 'DONE') {
      openCompletionForm(task);
      return;
    }

    if (nextStatus === 'PENDING_ACCEPT') {
      const confirmed = window.confirm('Trả công việc về trạng thái Chờ nhận việc? Tên người làm hiện tại sẽ được xóa.');
      if (!confirmed) return;
    }

    try {
      await api.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      await fetchTasks();
      if (selectedTask?.id === task.id) {
        const detail = await api.get(`/tasks/${task.id}`);
        setSelectedTask(detail.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể cập nhật trạng thái');
      fetchTasks();
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
      setSubmittingWork(true);
      setSubmitError('');
      const formData = new FormData();
      formData.append('completionNote', completionNote.trim());
      submissionFiles.forEach((file) => formData.append('files', file));
      await api.post(`/tasks/${selectedTask.id}/complete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowSubmitModal(false);
      setCompletionNote('');
      setSubmissionFiles([]);
      await fetchTasks();
      const detail = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(detail.data);
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || 'Lỗi nộp báo cáo nghiệm thu');
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleDownloadAttachment = async (attachment: TaskAttachment) => {
    try {
      const response = await api.get(`/tasks/attachments/${attachment.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể tải file');
    }
  };

  // 7. Mở Modal Chỉnh Sửa Công Việc
  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditAssigneeIds(task.assignees?.map((a) => a.id) || []);
    setShowEditModal(true);
  };

  // 8. Lưu Thay Đổi Khi Sửa Công Việc
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    try {
      setSavingEdit(true);
      await api.put(`/tasks/${editingTask.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        assigneeIds: editAssigneeIds,
      });
      setShowEditModal(false);
      setEditingTask(null);
      setEditDeadlineError(null);
      fetchTasks();
      if (selectedTask?.id === editingTask.id) {
        const res = await api.get('/tasks');
        const updated = res.data.find((t: any) => t.id === editingTask.id);
        if (updated) setSelectedTask(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật công việc');
    } finally {
      setSavingEdit(false);
    }
  };

  // 9. Mở Modal Xác Nhận Xóa
  const openDeleteConfirm = (taskId: string) => {
    setDeletingTaskId(taskId);
    setShowDeleteConfirmModal(true);
  };

  // 10. Xác nhận xóa vĩnh viễn
  const handleConfirmDelete = async () => {
    if (!deletingTaskId) return;
    try {
      await api.delete(`/tasks/${deletingTaskId}`);
      setShowDeleteConfirmModal(false);
      if (selectedTask?.id === deletingTaskId) {
        setSelectedTask(null);
      }
      setDeletingTaskId(null);
      fetchTasks();
    } catch (error) {
      console.error('Lỗi xóa task', error);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    openDeleteConfirm(taskId);
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
      matchesScope = t.assignees?.some((a) => a.id === user?.id);
    } else if (scopeFilter === 'OPEN') {
      matchesScope = t.status === 'PENDING_ACCEPT' && (!t.assignees || t.assignees.length === 0);
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

  const getStatusLabel = (status: TaskItem['status']) => ({
    PENDING_ACCEPT: 'Chờ nhận việc',
    IN_PROGRESS: 'Đang làm',
    DONE: 'Hoàn thành',
  }[status]);

  const getStatusBadgeClass = (status: TaskItem['status']) => {
    if (status === 'DONE') return isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'IN_PROGRESS') return isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return isLight ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/15 text-purple-400 border-purple-500/30';
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
      id: 'DONE',
      label: '3. Đã Hoàn Thành',
      color: 'border-emerald-500/50',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      desc: 'Nghiệm thu hoàn tất 100%',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h2 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight break-words leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Quản Lý Công Việc & Tiến Trình
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shrink-0 ${
                isLight ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              }`}
            >
              {totalItems} Tasks
            </span>
          </div>
          <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Bảng công việc thật theo Workspace: nhân viên tự ghi tên nhận việc và cập nhật trạng thái trực tiếp trên từng dòng
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div
            className={`flex items-center p-1 rounded-xl sm:rounded-2xl border shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Danh Sách"
            >
              <List className="w-3.5 h-3.5" /> Bảng Sheet
            </button>
          </div>

          {canCreateTask && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Đăng Việc Mới
            </button>
          )}
        </div>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full min-w-0">
        <button
          onClick={() => setScopeFilter('MY_TASKS')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer max-w-full ${
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
          onClick={() => setScopeFilter('OPEN')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer max-w-full ${
            scopeFilter === 'OPEN'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : isLight
              ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Chờ Nhận Việc ({tasks.filter((t) => t.status === 'PENDING_ACCEPT' && t.assignees.length === 0).length})
        </button>

        <button
          onClick={() => setScopeFilter('ALL')}
          className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition cursor-pointer max-w-full ${
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
      <div className="glass-panel p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80 min-w-0">
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

        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border cursor-pointer ${
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
            className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500 transition border cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-800'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
            }`}
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="PENDING_ACCEPT">Chờ tiếp nhận</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="DONE">Đã hoàn thành</option>
          </select>
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
          className={`text-center py-12 sm:py-16 rounded-2xl sm:rounded-3xl border space-y-4 shadow-xl p-4 sm:p-8 ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'
          }`}
        >
          <CheckSquare className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
          <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
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
        /* KANBAN BOARD VIEW (Vertical Stack on Mobile, 2-Col on Tablet, 4-Col on Desktop) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-start w-full max-w-full min-w-0">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`w-full max-w-full min-w-0 rounded-2xl sm:rounded-3xl border p-3.5 sm:p-4 lg:p-5 flex flex-col xl:min-h-[460px] shadow-xl space-y-3 sm:space-y-3.5 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'glass-panel border-white/[0.08]'
                }`}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-2.5 sm:pb-3 border-b gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-xs sm:text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{col.label}</h3>
                    <p className={`text-[10px] sm:text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{col.desc}</p>
                  </div>
                  <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-extrabold shrink-0 ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in this column */}
                <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
                  {colTasks.length === 0 ? (
                    <div className={`py-4 sm:py-6 px-3 text-center rounded-xl sm:rounded-2xl border border-dashed text-xs ${
                      isLight ? 'bg-slate-50/50 border-slate-200 text-slate-400' : 'bg-slate-900/30 border-slate-800 text-slate-500'
                    }`}>
                      Chưa có công việc
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const myAssigneeObj = t.assignees?.find((a) => a.id === user?.id);
                      const isPendingMyAccept = myAssigneeObj?.acceptanceStatus === 'PENDING';
                      const isOpenTask = t.status === 'PENDING_ACCEPT' && t.assignees.length === 0;

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md space-y-2.5 sm:space-y-3 group w-full min-w-0 ${
                            isLight
                              ? 'bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-300'
                              : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80 hover:border-blue-500/40'
                          }`}
                        >
                          {/* Title & Priority + Quick Actions */}
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={`font-bold text-xs sm:text-sm transition line-clamp-2 break-words flex-1 min-w-0 ${
                                isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'
                              }`}
                            >
                              {t.title}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              {getPriorityBadge(t.priority)}
                              {(isAdminOrManager || user?.role === 'SECRETARY') && (
                                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(t);
                                    }}
                                    className={`p-1 rounded-lg transition cursor-pointer ${
                                      isLight ? 'hover:bg-blue-100 text-blue-600' : 'hover:bg-blue-600/20 text-blue-400'
                                    }`}
                                    title="Chỉnh sửa công việc"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteConfirm(t.id);
                                    }}
                                    className={`p-1 rounded-lg transition cursor-pointer ${
                                      isLight ? 'hover:bg-rose-100 text-rose-600' : 'hover:bg-rose-600/20 text-rose-400'
                                    }`}
                                    title="Xóa công việc"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {t.description && (
                            <p className={`text-[11px] sm:text-xs line-clamp-2 break-words ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.description}</p>
                          )}

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className={`flex justify-between text-[10px] min-[360px]:text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
                          {isOpenTask && (
                            <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClaimTask(t.id);
                                }}
                                className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Ghi tên tôi / Nhận việc
                              </button>
                            </div>
                          )}

                          {isPendingMyAccept && (
                            <div className={`pt-2 border-t flex items-center gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptTask(t.id);
                                }}
                                className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Tiếp nhận task
                              </button>
                            </div>
                          )}

                          {/* Quick Action Button if In Progress -> Submit Review */}
                          {t.status === 'IN_PROGRESS' && myAssigneeObj?.acceptanceStatus === 'ACCEPTED' && (
                            <div className={`pt-2 border-t flex items-center gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCompletionForm(t);
                                }}
                                className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                              </button>
                            </div>
                          )}

                          {/* Assignees footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] sm:text-[11px] text-slate-400">
                            <div className="flex items-center -space-x-1.5">
                              {t.assignees?.map((a) => (
                                <div
                                  key={a.id}
                                  title={`${a.name} (${a.acceptanceStatus === 'ACCEPTED' ? 'Đã nhận' : 'Chưa nhận'})`}
                                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white border-2 border-slate-900 ${
                                    a.acceptanceStatus === 'ACCEPTED' ? 'bg-blue-600' : 'bg-purple-600'
                                  }`}
                                >
                                  {a.name.slice(0, 1).toUpperCase()}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW WITH DUAL RESPONSIVE RENDERING (CARDS ON MOBILE, TABLE ON DESKTOP) */
        <div className={`rounded-2xl sm:rounded-3xl border shadow-xl overflow-hidden ${isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'glass-panel border-white/[0.08]'}`}>
          {/* 1. Mobile Task Cards (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {paginatedTasks.map((t) => {
              const isPendingMyAccept = t.assignees?.some(
                (a) => a.id === user?.id && a.acceptanceStatus === 'PENDING'
              );
              const owner = t.assignees.find((assignee) => assignee.acceptanceStatus === 'ACCEPTED') || t.assignees[0];
              const isOpenTask = t.status === 'PENDING_ACCEPT' && t.assignees.length === 0;
              const canUpdateStatus = Boolean(owner?.id === user?.id || isAdminOrManager || user?.role === 'SECRETARY');
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className={`p-3.5 sm:p-4 transition cursor-pointer space-y-2.5 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`font-bold text-xs sm:text-sm line-clamp-2 break-words flex-1 min-w-0 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {t.title}
                    </h4>
                    <div className="shrink-0">{getPriorityBadge(t.priority)}</div>
                  </div>

                  {t.description && (
                    <p className={`text-[11px] line-clamp-2 break-words ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.description}</p>
                  )}

                  {/* Progress & Status */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] min-[360px]:text-[11px]">
                      <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        Tiến độ ({t.completedSubtasks}/{t.totalSubtasks})
                      </span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">{t.progress}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer info: Status badge, Assignee & Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] min-[360px]:text-[10px] font-extrabold border ${getStatusBadgeClass(t.status)}`}
                      >
                        {getStatusLabel(t.status)}
                      </span>

                      {owner && <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{owner.name}</span>}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOpenTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimTask(t.id);
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3" /> Ghi tên tôi
                        </button>
                      )}
                      {isPendingMyAccept && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptTask(t.id);
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Nhận
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(t);
                        }}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isLight ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10'
                        }`}
                        title="Xem chi tiết"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {owner && (
                    <StatusPicker
                      status={t.status}
                      disabled={!canUpdateStatus}
                      isLight={isLight}
                      onChange={(nextStatus) => handleInlineStatusChange(t, nextStatus)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bảng giao việc kiểu Sheet trên desktop */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <table className={`w-full text-left text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <thead className={`${isLight ? 'bg-emerald-800 text-white' : 'bg-emerald-950 text-emerald-50'} sticky top-0 z-10`}>
                <tr>
                  <th className="w-20 px-4 py-3.5 text-center border-r border-white/20 uppercase tracking-wider text-xs">STT</th>
                  <th className="px-5 py-3.5 border-r border-white/20 uppercase tracking-wider text-xs">Tên công việc</th>
                  <th className="w-64 px-5 py-3.5 border-r border-white/20 uppercase tracking-wider text-xs">Người làm</th>
                  <th className="w-60 px-5 py-3.5 uppercase tracking-wider text-xs">Trạng thái</th>
                </tr>
              </thead>
              <tbody className={isLight ? 'divide-y divide-slate-200' : 'divide-y divide-slate-800'}>
                {paginatedTasks.map((task, rowIndex) => {
                  const owner = task.assignees.find((assignee) => assignee.acceptanceStatus === 'ACCEPTED') || task.assignees[0];
                  const isOpenTask = task.status === 'PENDING_ACCEPT' && task.assignees.length === 0;
                  const canUpdateStatus = Boolean(owner?.id === user?.id || isAdminOrManager || user?.role === 'SECRETARY');

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`group cursor-pointer transition ${isLight ? 'odd:bg-white even:bg-slate-50 hover:bg-blue-50' : 'odd:bg-slate-900/45 even:bg-slate-900/70 hover:bg-slate-800'}`}
                    >
                      <td className={`px-4 py-3.5 text-center font-extrabold border-r ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
                        {String(startIndex + rowIndex + 1).padStart(3, '0')}
                      </td>
                      <td className={`px-5 py-3.5 border-r ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                        <p className={`font-bold group-hover:text-blue-600 transition ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{task.title}</p>
                        {task.description && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{task.description}</p>}
                      </td>
                      <td className={`px-5 py-3.5 border-r ${isLight ? 'border-slate-200' : 'border-slate-800'}`} onClick={(event) => event.stopPropagation()}>
                        {owner ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${owner.acceptanceStatus === 'ACCEPTED' ? 'bg-blue-600 text-white border-blue-500' : 'bg-purple-500/15 text-purple-600 border-purple-500/30'}`}>
                              <UserIcon className="w-3.5 h-3.5" /> {owner.name}
                            </span>
                            {owner.acceptanceStatus !== 'ACCEPTED' && owner.id === user?.id && (
                              <button type="button" onClick={() => handleAcceptTask(task.id)} className="text-xs font-bold text-purple-600 hover:underline cursor-pointer">Xác nhận</button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleClaimTask(task.id)}
                            disabled={!isOpenTask}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold shadow-sm cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Ghi tên tôi / Nhận việc
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5" onClick={(event) => event.stopPropagation()}>
                        <StatusPicker
                          status={task.status}
                          disabled={!canUpdateStatus || isOpenTask}
                          isLight={isLight}
                          onChange={(nextStatus) => handleInlineStatusChange(task, nextStatus)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bảng cũ được giữ trong mã để tương thích nhưng không còn hiển thị */}
          <div className="hidden">
            <table className={`w-full text-left text-xs ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              <thead className={`font-semibold border-b uppercase tracking-wider text-[10px] ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900/90 text-slate-400 border-slate-800'}`}>
                <tr>
                  <th className="py-3.5 px-4 w-14 text-center">STT</th>
                  <th className="py-3.5 px-4">Tên Công Việc</th>
                  <th className="py-3.5 px-4">Mức Độ</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Tiến Độ</th>
                  <th className="py-3.5 px-4">Người Thực Hiện</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/80 text-slate-300'}`}>
                {paginatedTasks.map((t, rowIndex) => {
                  const isPendingMyAccept = t.assignees?.some(
                    (a) => a.id === user?.id && a.acceptanceStatus === 'PENDING'
                  );
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`transition cursor-pointer group ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}`}
                    >
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-400">
                        {startIndex + rowIndex + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 min-w-[180px]">
                          <span className={`font-bold transition text-sm line-clamp-1 ${isLight ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-blue-400'}`}>
                            {t.title}
                          </span>
                          {t.description && (
                            <p className={`text-xs line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(t.status)}`}
                        >
                          {getStatusLabel(t.status)}
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
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                          {(isAdminOrManager || user?.role === 'SECRETARY') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(t);
                                }}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  isLight ? 'text-blue-600 hover:bg-blue-50' : 'text-blue-400 hover:bg-blue-500/10'
                                }`}
                                title="Chỉnh sửa task"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(t.id);
                                }}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-500/10'
                                }`}
                                title="Xóa task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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
            <div className={`p-3.5 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'}`}>
              <div className="text-center sm:text-left">
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
                  Tạo bởi <strong className={isLight ? 'text-slate-800 font-bold' : 'text-slate-200'}>{selectedTask.createdBy?.name}</strong>
                </p>
              </div>

              {/* Status pill */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold self-start shadow-sm border ${getStatusBadgeClass(selectedTask.status)}`}
              >
                {getStatusLabel(selectedTask.status)}
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
              <div className="flex flex-col min-[380px]:flex-row gap-2 pt-1">
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
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer shrink-0 text-center"
                >
                  + Thêm việc
                </button>
              </div>
            </div>

            {/* Submission history */}
            {selectedTask.submissions && selectedTask.submissions.length > 0 ? (
              <div className="space-y-3">
                <h4 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <FileCheck className="w-4 h-4" /> Lịch sử nộp kết quả ({selectedTask.submissions.length})
                </h4>
                {selectedTask.submissions.map((submission, index) => (
                  <div key={submission.id} className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-indigo-950/30 border-indigo-500/30'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          Lần nộp #{selectedTask.submissions!.length - index} • {submission.submittedBy.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{new Date(submission.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        submission.reviewStatus === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                          : submission.reviewStatus === 'FAILED'
                          ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                          : submission.reviewStatus === 'CHANGES_REQUESTED'
                          ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                      }`}>
                        {submission.reviewStatus === 'APPROVED' ? 'Đã duyệt' : submission.reviewStatus === 'FAILED' ? 'Thất bại' : submission.reviewStatus === 'CHANGES_REQUESTED' ? 'Cần sửa' : 'Chờ kiểm tra'}
                      </span>
                    </div>

                    {submission.note && <p className={`text-xs whitespace-pre-wrap leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{submission.note}</p>}

                    {submission.attachments.length > 0 && (
                      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2">
                        {submission.attachments.map((attachment) => (
                          <div key={attachment.id} className={`p-2.5 rounded-xl border space-y-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/70 border-slate-700'}`}>
                            {attachment.mimeType.startsWith('image/') && (
                              <ProtectedImagePreview attachment={attachment} onOpen={() => handleDownloadAttachment(attachment)} />
                            )}
                            <div className="flex items-center gap-2 min-w-0">
                              {attachment.mimeType.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" /> : <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <p className={`text-[11px] font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{attachment.originalName}</p>
                                <p className="text-[10px] text-slate-400">{formatFileSize(attachment.size)}</p>
                              </div>
                              <button type="button" onClick={() => handleDownloadAttachment(attachment)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-500/10 cursor-pointer" title="Tải file">
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {submission.feedback && (
                      <div className={`pt-2 border-t text-xs font-medium ${isLight ? 'border-blue-200 text-amber-800' : 'border-indigo-500/20 text-amber-300'}`}>
                        <strong>Nhận xét của quản lý:</strong> {submission.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedTask.completionReport ? (
              <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-blue-50/80 border-blue-200' : 'bg-indigo-950/40 border-indigo-500/30'}`}>
                <h5 className="text-xs font-extrabold text-blue-600">Báo cáo nghiệm thu cũ</h5>
                <p className="text-xs whitespace-pre-wrap">{selectedTask.completionReport}</p>
              </div>
            ) : null}

            {selectedTask.activities && selectedTask.activities.length > 0 && (
              <details className={`rounded-2xl border p-3.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/30 border-slate-700'}`}>
                <summary className="text-xs font-extrabold cursor-pointer flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" /> Nhật ký công việc ({selectedTask.activities.length})
                </summary>
                <div className="mt-3 space-y-2 border-l-2 border-blue-500/30 pl-3">
                  {selectedTask.activities.map((activity) => (
                    <div key={activity.id} className="text-[11px]">
                      <p className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{activity.actor?.name || 'Hệ thống'} • {activity.type}</p>
                      {activity.note && <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>{activity.note}</p>}
                      <p className="text-[10px] text-slate-400">{new Date(activity.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Action Bar */}
            <div className={`pt-4 border-t flex flex-col min-[480px]:flex-row items-stretch min-[480px]:items-center justify-between gap-2.5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              {(isAdminOrManager || user?.role === 'SECRETARY') ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedTask)}
                    className="flex-1 min-[480px]:flex-none px-3.5 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Sửa Task
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteConfirm(selectedTask.id)}
                    className={`flex-1 min-[480px]:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isLight
                        ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 shadow-sm'
                        : 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" /> Xóa Task
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 flex-wrap min-[480px]:ml-auto">
                {selectedTask.status === 'PENDING_ACCEPT' && selectedTask.assignees.length === 0 && (
                  <button
                    onClick={() => handleClaimTask(selectedTask.id)}
                    className="flex-1 min-[480px]:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" /> Ghi Tên Tôi / Nhận Việc
                  </button>
                )}

                {/* Accept/Decline button for pending assignee */}
                {selectedTask.assignees?.some((a) => a.id === user?.id && a.acceptanceStatus === 'PENDING') && (
                  <>
                    <button
                      onClick={() => setShowDeclineModal(true)}
                      className={`flex-1 min-[480px]:flex-none px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                        isLight ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200' : 'bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white'
                      }`}
                    >
                      Từ Chối
                    </button>
                    <button
                      onClick={() => handleAcceptTask(selectedTask.id)}
                      className="flex-1 min-[480px]:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Check className="w-4 h-4" /> Tiếp Nhận Task
                    </button>
                  </>
                )}

                {/* Submit review button for in-progress member */}
                {selectedTask.status === 'IN_PROGRESS' &&
                  selectedTask.assignees?.some((a) => a.id === user?.id && a.acceptanceStatus === 'ACCEPTED') && (
                    <button
                      onClick={() => {
                        setCompletionNote('');
                        setSubmissionFiles([]);
                        setSubmitError('');
                        setShowSubmitModal(true);
                      }}
                      className="w-full min-[480px]:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Hoàn Thành
                    </button>
                  )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal xác nhận hoàn thành, toàn bộ nội dung đính kèm là tùy chọn */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => {
          if (!submittingWork) {
            setShowSubmitModal(false);
            setSubmissionFiles([]);
            setSubmitError('');
          }
        }}
        title="Xác Nhận Hoàn Thành Công Việc"
      >
        <div className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Ghi chú, file và ảnh minh chứng đều không bắt buộc. Bạn có thể để trống hoàn toàn và bấm xác nhận ngay.
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
          <label className={`block p-4 rounded-2xl border-2 border-dashed cursor-pointer transition ${isLight ? 'bg-slate-50 border-slate-300 hover:border-blue-400' : 'bg-slate-800/50 border-slate-700 hover:border-blue-500'}`}>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.zip"
              className="hidden"
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files || []);
                if (nextFiles.length > 10) {
                  setSubmitError('Chỉ được chọn tối đa 10 file mỗi lần nộp.');
                  return;
                }
                const oversized = nextFiles.find((file) => file.size > 20 * 1024 * 1024);
                if (oversized) {
                  setSubmitError(`File ${oversized.name} vượt quá 20 MB.`);
                  return;
                }
                setSubmissionFiles(nextFiles);
                setSubmitError('');
              }}
            />
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center"><Upload className="w-5 h-5" /></div>
              <p className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Chọn file hoặc ảnh từ thiết bị</p>
              <p className="text-[10px] text-slate-400">Ảnh, PDF, Word, Excel, TXT, CSV hoặc ZIP</p>
            </div>
          </label>

          {submissionFiles.length > 0 && (
            <div className="space-y-2">
              {submissionFiles.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}`} className={`flex items-center gap-3 p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                  {file.type.startsWith('image/') ? <LocalImagePreview file={file} /> : <Paperclip className="w-5 h-5 text-blue-500 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{file.name}</p>
                    <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => setSubmissionFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {submitError && <p className="text-xs font-semibold text-rose-500">{submitError}</p>}
          <div className={`flex flex-col min-[380px]:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => {
                setShowSubmitModal(false);
                setSubmissionFiles([]);
                setSubmitError('');
              }}
              disabled={submittingWork}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={submittingWork}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer text-center"
            >
              {submittingWork ? 'Đang hoàn tất...' : '✅ Xác Nhận Hoàn Thành'}
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
          <div className={`flex flex-col min-[380px]:flex-row justify-end gap-2 sm:gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <button
              onClick={() => setShowDeclineModal(false)}
              className={`px-4 py-2 text-xs font-semibold cursor-pointer rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'}`}
            >
              Hủy
            </button>
            <button
              onClick={handleDeclineTask}
              disabled={!declineReason.trim()}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer text-center"
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
        title="Đăng Công Việc Mới Lên Bảng"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tên Công Việc <span className="text-rose-500">*</span>
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

          <div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Mức Độ Ưu Tiên
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${priority === option.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                      : isLight ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50' : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-blue-500/50'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />
                    {option.label}
                  </button>
                ))}
              </div>
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
                        setDueDateTime(preset);
                        if (dueDateDate) {
                          setDeadlineError(validateHiddenDeadline(dueDateDate, preset));
                        }
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                        dueDateTime === preset
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
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
                    value={dueDateDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setDueDateDate(e.target.value);
                      if (e.target.value || dueDateTime) {
                        setDeadlineError(validateHiddenDeadline(e.target.value, dueDateTime));
                      } else {
                        setDeadlineError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                      deadlineError
                        ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                        : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    } ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <input
                    type="time"
                    value={dueDateTime}
                    placeholder="Chọn giờ"
                    onChange={(e) => {
                      setDueDateTime(e.target.value);
                      if (dueDateDate || e.target.value) {
                        setDeadlineError(validateHiddenDeadline(dueDateDate, e.target.value));
                      } else {
                        setDeadlineError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                      deadlineError
                        ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                        : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    } ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {deadlineError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deadlineError}</span>
                </div>
              )}
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${isLight ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-purple-500/10 border-purple-500/30 text-purple-300'}`}>
            <UserCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold">Công việc sẽ được đăng lên bảng chờ nhận</p>
              <p className="text-[11px] mt-1 opacity-80">Nhân viên sẽ tự bấm “Ghi tên tôi / Nhận việc” ở cột Người làm.</p>
            </div>
          </div>

          <details className={`group rounded-2xl border overflow-hidden ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-700'}`}>
            <summary className={`list-none flex items-center justify-between gap-3 px-4 py-3 cursor-pointer text-xs font-extrabold ${isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-200 hover:bg-slate-800/70'}`}>
              <span className="inline-flex items-center gap-2"><ListTodo className="w-4 h-4 text-blue-500" /> Tùy chọn nâng cao</span>
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className={`space-y-4 px-4 pb-4 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
              <TelegramTagPicker
                value={telegramTag}
                onChange={setTelegramTag}
                label="Tag thêm thành viên Telegram (@username)"
                helperText="Bot luôn báo công việc mới vào nhóm chung; mục này chỉ dùng khi muốn tag thêm người cụ thể."
              />

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

            <div className="flex flex-col min-[380px]:flex-row gap-2">
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 text-center ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                + Thêm
              </button>
            </div>
              </div>
            </div>
          </details>

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
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Plus className="w-4 h-4" /> Giao Việc & Gửi Thông Báo
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chỉnh Sửa Công Việc */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Chỉnh Sửa Công Việc #${editingTask?.id || ''}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Tên Công Việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nhập tên công việc..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
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
              placeholder="Mô tả mục tiêu, yêu cầu nghiệm thu..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-none focus:border-blue-500 transition ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-100' : 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
              }`}
            />
          </div>

          <div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Mức Độ Ưu Tiên
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEditPriority(option.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${editPriority === option.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                      : isLight ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50' : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-blue-500/50'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${option.dotClass}`} />
                    {option.label}
                  </button>
                ))}
              </div>
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
                        setEditDueDateTime(preset);
                        if (editDueDateDate) {
                          setEditDeadlineError(validateHiddenDeadline(editDueDateDate, preset));
                        }
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                        editDueDateTime === preset
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
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
                    value={editDueDateDate}
                    onChange={(e) => {
                      setEditDueDateDate(e.target.value);
                      if (e.target.value || editDueDateTime) {
                        setEditDeadlineError(validateHiddenDeadline(e.target.value, editDueDateTime));
                      } else {
                        setEditDeadlineError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                      editDeadlineError
                        ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                        : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    } ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <input
                    type="time"
                    value={editDueDateTime}
                    placeholder="Chọn giờ"
                    onChange={(e) => {
                      setEditDueDateTime(e.target.value);
                      if (editDueDateDate || e.target.value) {
                        setEditDeadlineError(validateHiddenDeadline(editDueDateDate, e.target.value));
                      } else {
                        setEditDeadlineError(null);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none transition ${
                      editDeadlineError
                        ? 'border-rose-500 bg-rose-500/5 focus:ring-2 focus:ring-rose-500/20'
                        : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    } ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-800/80 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {editDeadlineError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editDeadlineError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Phân công thành viên */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Chuyển Người Làm (chọn tối đa 1 người)
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
              {members.map((m) => {
                const isSelected = editAssigneeIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      if (isSelected) {
                        setEditAssigneeIds([]);
                      } else {
                        setEditAssigneeIds([m.id]);
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
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Check className="w-4 h-4" /> {savingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác Nhận Xóa Công Việc Đẹp Mắt */}
      <Modal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Xác Nhận Xóa Công Việc"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                Bạn có chắc chắn muốn xóa vĩnh viễn công việc này?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toàn bộ tiến độ, danh sách việc con và báo cáo nghiệm thu đính kèm sẽ bị xóa hoàn toàn khỏi hệ thống.
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
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Trash2 className="w-4 h-4" /> Xóa Vĩnh Viễn
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
