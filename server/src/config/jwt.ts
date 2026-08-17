import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'madbros-enterprise-secret-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
