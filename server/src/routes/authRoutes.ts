import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/join', AuthController.joinWithCode);
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

export default router;
