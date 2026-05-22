import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mockPrisma } from '@shared/test-utils.js';
import type { User, RefreshToken } from '@prisma/client';

// Mock prisma singleton before importing the router
const db = mockPrisma();
vi.mock('@shared/prisma.js', () => ({ prisma: db }));

// Mock env
vi.mock('@config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'access-secret-key-that-is-at-least-32-chars',
    JWT_REFRESH_SECRET: 'refresh-secret-key-that-is-at-least-32chars',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  },
}));

// Mock bcryptjs to avoid slow hashing in tests
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn(),
  },
}));

// Mock jwt to control token generation
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-token'),
    verify: vi.fn(),
  },
}));

// Helper to create a test Express app
async function buildApp() {
  const { authRouter } = await import('../auth.js');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

const baseUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  name: 'Test User',
  role: 'USER',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseRefreshToken: RefreshToken = {
  id: 'rt-1',
  userId: 'user-1',
  token: 'mock-refresh-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with userId, email, name on success', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(baseUser);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('returns 409 when email already exists', async () => {
    db.user.findUnique.mockResolvedValue(baseUser);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(409);
  });

  it('returns 400 when email is missing', async () => {
    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with tokens on successful login', async () => {
    const { default: bcrypt } = await import('bcryptjs');
    db.user.findUnique.mockResolvedValue(baseUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    db.refreshToken.create.mockResolvedValue(baseRefreshToken);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      userId: 'user-1',
    });
  });

  it('returns 401 when email is not found', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    const { default: bcrypt } = await import('bcryptjs');
    db.user.findUnique.mockResolvedValue(baseUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with new accessToken on valid refresh token', async () => {
    const { default: jwtLib } = await import('jsonwebtoken');
    vi.mocked(jwtLib.verify).mockReturnValue({
      userId: 'user-1',
      type: 'refresh',
    } as never);
    db.refreshToken.findUnique.mockResolvedValue(baseRefreshToken);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accessToken: expect.any(String) });
  });

  it('returns 401 when token is not in DB (revoked)', async () => {
    const { default: jwtLib } = await import('jsonwebtoken');
    vi.mocked(jwtLib.verify).mockReturnValue({
      userId: 'user-1',
      type: 'refresh',
    } as never);
    db.refreshToken.findUnique.mockResolvedValue(null);

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'revoked-token' });

    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const { default: jwtLib } = await import('jsonwebtoken');
    vi.mocked(jwtLib.verify).mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bad-token' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and deletes the refresh token', async () => {
    db.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'valid-refresh-token' });

    expect(res.status).toBe(200);
    expect(db.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'valid-refresh-token' },
    });
  });

  it('returns 200 even when token does not exist (idempotent)', async () => {
    db.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'nonexistent-token' });

    expect(res.status).toBe(200);
  });
});
