import { Router } from 'express';
import { StatsController } from '../controllers/statsController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/overview', StatsController.getDashboardOverview);

export default router;
