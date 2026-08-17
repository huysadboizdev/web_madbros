import { Router } from 'express';
import { MeetingController } from '../controllers/meetingController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', MeetingController.getMeetings);
router.post('/', MeetingController.createMeeting);
router.put('/:id', MeetingController.updateMeeting);
router.delete('/:id', MeetingController.deleteMeeting);
router.post('/:id/status', MeetingController.updateStatus);

export default router;
