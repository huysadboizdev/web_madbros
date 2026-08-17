import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspaceController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Tất cả route workspace yêu cầu xác thực
router.use(authenticate);

// Gửi yêu cầu gia nhập bằng mã phòng (Dành cho thành viên mới)
router.post('/request-join', WorkspaceController.requestJoin);

router.get('/', WorkspaceController.getWorkspaceDetails);
router.get('/members', WorkspaceController.getMembers);
router.get('/details', WorkspaceController.getWorkspaceDetails);
router.patch('/details', WorkspaceController.updateWorkspace);
router.put('/details', WorkspaceController.updateWorkspace);
router.post('/regenerate-code', WorkspaceController.regenerateCode);
router.patch('/members/:userId/role', WorkspaceController.updateMemberRole);
router.put('/members/:userId/role', WorkspaceController.updateMemberRole);
router.delete('/members/:userId', WorkspaceController.removeMember);
router.post('/smtp', WorkspaceController.updateSmtpSettings);
router.put('/smtp', WorkspaceController.updateSmtpSettings);
router.put('/settings/smtp', WorkspaceController.updateSmtpSettings);
router.post('/settings/smtp', WorkspaceController.updateSmtpSettings);
router.post('/smtp/test', WorkspaceController.testEmail);
router.post('/settings/test-email', WorkspaceController.testEmail);
router.post('/telegram/test', WorkspaceController.testTelegram);
router.post('/settings/test-telegram', WorkspaceController.testTelegram);

export default router;
