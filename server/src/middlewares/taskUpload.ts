import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export const TASK_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/tasks');

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });
    callback(null, TASK_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
    callback(null, `${randomUUID()}${extension}`);
  },
});

const taskUpload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error(`Loại file không được hỗ trợ: ${file.originalname}`));
      return;
    }
    callback(null, true);
  },
});

export const uploadTaskFiles = (req: Request, res: Response, next: NextFunction) => {
  taskUpload.array('files', 10)(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }

    const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
      ? 'Mỗi file không được vượt quá 20 MB'
      : error.message || 'Không thể tải file lên';

    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];
    for (const file of uploadedFiles) {
      fs.promises.unlink(file.path).catch(() => undefined);
    }

    res.status(400).json({ message });
  });
};
