import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspaceController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', WorkspaceController.getWorkspaceDetails);
router.put('/', requireAdmin, WorkspaceController.updateWorkspace);
router.post('/regenerate-code', requireAdmin, WorkspaceController.regenerateCode);
router.patch('/members/:userId/role', requireAdmin, WorkspaceController.updateMemberRole);
router.delete('/members/:userId', requireAdmin, WorkspaceController.removeMember);
router.put('/settings/smtp', requireAdmin, WorkspaceController.updateSmtpSettings);
router.post('/settings/test-email', requireAdmin, WorkspaceController.testEmail);

export default router;
