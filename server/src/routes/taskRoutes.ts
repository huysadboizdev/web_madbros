import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { authenticate } from '../middlewares/auth';
import { uploadTaskFiles } from '../middlewares/taskUpload';

const router = Router();

router.use(authenticate);

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.get('/attachments/:attachmentId/download', TaskController.downloadAttachment);
router.get('/:id', TaskController.getTaskById);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

// Vòng đời tiếp nhận & duyệt task
router.post('/:id/claim', TaskController.claimTask);
router.post('/:id/accept', TaskController.acceptTask);
router.post('/:id/decline', TaskController.declineTask);
router.patch('/:id/status', TaskController.updateTaskStatus);
router.post('/:id/complete', uploadTaskFiles, TaskController.submitForReview);
router.post('/:id/submit-review', uploadTaskFiles, TaskController.submitForReview);

// Subtasks
router.post('/:taskId/subtasks', TaskController.addSubtask);
router.patch('/subtasks/:subtaskId/toggle', TaskController.toggleSubtask);
router.delete('/subtasks/:subtaskId', TaskController.deleteSubtask);

export default router;
