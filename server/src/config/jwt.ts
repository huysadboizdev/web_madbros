import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'madbros-enterprise-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET + '-refresh-salt-2026');

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
}

// 1. Tạo Access Token (Ngắn hạn: 15 phút)
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

// 2. Tạo Refresh Token (Dài hạn: 7 ngày)
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign({ userId: payload.userId, email: payload.email }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Hàm tương thích ngược cho generateToken
export const generateToken = (payload: TokenPayload): string => {
  return generateAccessToken(payload);
};

// 3. Xác thực Access Token
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyToken = (token: string): TokenPayload => {
  return verifyAccessToken(token);
};

// 4. Xác thực Refresh Token
export const verifyRefreshToken = (token: string): { userId: string; email: string } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; email: string };
};
