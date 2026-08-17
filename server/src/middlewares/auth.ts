import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../config/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ' });
  }
};

// Middleware kiểm tra quyền Quản trị viên (ADMIN)
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'Chỉ Quản trị viên (ADMIN) mới có quyền thực hiện thao tác này' });
    return;
  }
  next();
};

// Middleware kiểm tra vai trò cụ thể
export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
      return;
    }
    next();
  };
};
