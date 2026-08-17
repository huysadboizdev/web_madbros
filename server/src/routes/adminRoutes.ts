import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, requireRoles } from '../middlewares/auth';

const router = Router();

// Tất cả route trong admin đều yêu cầu đăng nhập và có quyền ADMIN hoặc MANAGER
router.use(authenticate);
router.use(requireRoles(['ADMIN', 'MANAGER']));

// 1. Overview
router.get('/overview', AdminController.getOverview);

// 2. Quản lý Mã Phòng (Workspace Code)
router.put('/workspace-code', AdminController.updateWorkspaceCode);

// 3. Duyệt Tay Nhân Viên Mới Chờ Gia Nhập (Manual Approvals)
router.get('/pending-users', AdminController.getPendingUsers);
router.post('/pending-users/:id/approve', AdminController.approvePendingUser);
router.put('/pending-users/:id/approve', AdminController.approvePendingUser);
router.patch('/pending-users/:id/approve', AdminController.approvePendingUser);
router.post('/pending-users/:id/reject', AdminController.rejectPendingUser);
router.put('/pending-users/:id/reject', AdminController.rejectPendingUser);
router.delete('/pending-users/:id/reject', AdminController.rejectPendingUser);
router.delete('/pending-users/:id', AdminController.rejectPendingUser);

// 4. Quản lý Nhân Sự Chính Thức (Users)
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.patch('/users/:id', AdminController.updateUser);
router.put('/users/:id', AdminController.updateUser);
router.put('/users/:id/role', AdminController.updateUser);
router.patch('/users/:id/role', AdminController.updateUser);
router.post('/users/:id/reset-password', AdminController.resetPassword);
router.put('/users/:id/password', AdminController.resetPassword);
router.patch('/users/:id/password', AdminController.resetPassword);
router.delete('/users/:id', AdminController.deleteUser);

// 5. Quản lý Tài Sản (Assets)
router.get('/assets', AdminController.getAssets);
router.post('/assets', AdminController.createAsset);
router.patch('/assets/:id', AdminController.updateAsset);
router.put('/assets/:id', AdminController.updateAsset);
router.delete('/assets/:id', AdminController.deleteAsset);

export default router;
