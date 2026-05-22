import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../auth.js';

// Mock env
vi.mock('@config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'access-secret-key-that-is-at-least-32-chars',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  },
}));

// Mock jwt module
vi.mock('@shared/jwt.js', () => ({
  verifyToken: vi.fn(),
}));

function makeReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as Partial<Request>;
}

function makeRes(): { res: Partial<Response>; statusMock: ReturnType<typeof vi.fn>; jsonMock: ReturnType<typeof vi.fn> } {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnThis();
  const res: Partial<Response> = {
    status: statusMock as unknown as Response['status'],
    json: jsonMock,
  };
  return { res, statusMock, jsonMock };
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() and sets req.userId when token is valid', async () => {
    const { verifyToken } = await import('@shared/jwt.js');
    vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123', type: 'access' });

    const req = makeReq('Bearer valid-token') as Request;
    const { res } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    authMiddleware(req, res as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe('user-123');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 401 and does NOT call next() when Authorization header is missing', async () => {
    const req = makeReq() as Request;
    const { res, statusMock } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    authMiddleware(req, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(401);
  });

  it('responds 401 and does NOT call next() when token is invalid', async () => {
    const { verifyToken } = await import('@shared/jwt.js');
    vi.mocked(verifyToken).mockReturnValue(null);

    const req = makeReq('Bearer bad-token') as Request;
    const { res, statusMock } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    authMiddleware(req, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(401);
  });

  it('responds 401 when Authorization header is present but not Bearer scheme', async () => {
    const req = makeReq('Basic dXNlcjpwYXNz') as Request;
    const { res, statusMock } = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    authMiddleware(req, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(401);
  });
});
