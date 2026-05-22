import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@shared/jwt.js';
import { env } from '@config/env.js';

// Augment Express Request to carry userId after successful authentication
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Bearer token middleware — validates the JWT access token in the
 * Authorization header and attaches userId to the request.
 *
 * On success:   sets req.userId and calls next()
 * On failure:   responds 401 and does NOT call next()
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or malformed' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  const payload = verifyToken(token, env.JWT_ACCESS_SECRET);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = payload.userId;
  next();
}
