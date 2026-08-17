import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/google', AuthController.googleLogin);
router.post('/google-login', AuthController.googleLogin);
router.get('/me', authenticate, AuthController.getMe);

export default router;
