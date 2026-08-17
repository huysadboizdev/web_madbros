import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../config/jwt';

export class SocketService {
  private static io: Server | null = null;

  static init(httpServer: HttpServer): Server {
    if (this.io) return this.io;

    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    // JWT Authentication Middleware for Socket.IO
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded: TokenPayload = verifyToken(token);
        socket.data.user = decoded;
        next();
      } catch (err) {
        console.warn('[Socket Auth Error] Token không hợp lệ:', err);
        return next(new Error('Invalid or expired token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as TokenPayload | undefined;
      if (!user) return;

      const workspaceRoom = `workspace_${user.workspaceId}`;
      const userRoom = `user_${user.userId}`;

      socket.join(workspaceRoom);
      socket.join(userRoom);

      console.log(`[Socket Connected] ⚡ ${user.email} (${user.role}) -> Rooms: [${workspaceRoom}, ${userRoom}]`);

      socket.on('disconnect', (reason) => {
        console.log(`[Socket Disconnected] 🔌 ${user.email} (${reason})`);
      });
    });

    console.log('⚡ [Socket.IO] Real-Time Gateway đã khởi động sẵn sàng!');
    return this.io;
  }

  static getIO(): Server | null {
    return this.io;
  }

  // Phát sự kiện đến toàn bộ người dùng trong Workspace
  static emitToWorkspace(workspaceId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`workspace_${workspaceId}`).emit(event, data);
  }

  // Phát sự kiện riêng cho 1 người dùng cụ thể (theo userId)
  static emitToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Phát sự kiện cho toàn bộ hệ thống
  static emitToAll(event: string, data: any) {
    if (!this.io) return;
    this.io.emit(event, data);
  }
}
