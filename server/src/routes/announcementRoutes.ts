import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcementController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', AnnouncementController.getAnnouncements);
router.post('/', AnnouncementController.createAnnouncement);
router.delete('/:id', AnnouncementController.deleteAnnouncement);
router.patch('/:id/pin', AnnouncementController.togglePin);

export default router;
