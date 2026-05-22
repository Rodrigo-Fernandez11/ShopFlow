import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

/**
 * Signs an access token with a 15-minute expiry.
 * Payload: { userId, type: 'access' }
 */
export function signAccessToken(userId: string, secret: string): string {
  return jwt.sign({ userId, type: 'access' }, secret, { expiresIn: '15m' });
}

/**
 * Signs a refresh token with a 7-day expiry.
 * Payload: { userId, type: 'refresh' }
 */
export function signRefreshToken(userId: string, secret: string): string {
  return jwt.sign({ userId, type: 'refresh' }, secret, { expiresIn: '7d' });
}

/**
 * Verifies a token against the given secret.
 * Returns the decoded payload on success, or null on any failure
 * (expired, wrong signature, malformed string).
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    if (
      typeof decoded?.userId !== 'string' ||
      (decoded.type !== 'access' && decoded.type !== 'refresh')
    ) {
      return null;
    }
    return { userId: decoded.userId, type: decoded.type };
  } catch {
    return null;
  }
}
