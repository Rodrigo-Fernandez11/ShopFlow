import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '@shared/prisma.js';
import { signAccessToken, signRefreshToken, verifyToken } from '@shared/jwt.js';
import { hashPassword, comparePassword } from '@shared/hash.js';
import { env } from '@config/env.js';

export const authRouter = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── POST /register ───────────────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  res.status(201).json({ userId: user.id, email: user.email, name: user.name });
});

// ─── POST /login ──────────────────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken(user.id, env.JWT_ACCESS_SECRET);
  const refreshToken = signRefreshToken(user.id, env.JWT_REFRESH_SECRET);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  res.status(200).json({ accessToken, refreshToken, userId: user.id });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { refreshToken } = parsed.data;

  const payload = verifyToken(refreshToken, env.JWT_REFRESH_SECRET);
  if (!payload || payload.type !== 'refresh') {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!storedToken) {
    res.status(401).json({ error: 'Refresh token revoked or not found' });
    return;
  }
  if (storedToken.expiresAt < new Date()) {
    res.status(401).json({ error: 'Refresh token expired' });
    return;
  }
  const accessToken = signAccessToken(payload.userId, env.JWT_ACCESS_SECRET);
  res.status(200).json({ accessToken });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

authRouter.post('/logout', async (req: Request, res: Response) => {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { refreshToken } = parsed.data;

  // Idempotent — delete matching token if it exists, silently succeed otherwise
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });

  res.status(200).json({ message: 'Logged out successfully' });
});
