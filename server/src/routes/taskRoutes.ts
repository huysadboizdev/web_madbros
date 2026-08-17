import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

// Vòng đời tiếp nhận & duyệt task
router.post('/:id/accept', TaskController.acceptTask);
router.post('/:id/decline', TaskController.declineTask);
router.post('/:id/submit-review', TaskController.submitForReview);
router.post('/:id/review', TaskController.reviewTask);

// Subtasks
router.post('/:taskId/subtasks', TaskController.addSubtask);
router.patch('/subtasks/:subtaskId/toggle', TaskController.toggleSubtask);
router.delete('/subtasks/:subtaskId', TaskController.deleteSubtask);

export default router;
