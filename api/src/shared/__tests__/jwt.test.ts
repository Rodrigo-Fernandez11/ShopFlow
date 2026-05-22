import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyToken } from '@shared/jwt.js';

const SECRET = 'super-secret-key-that-is-at-least-32-chars-long';
const USER_ID = 'user-123';

describe('signAccessToken', () => {
  it('returns a non-empty string', () => {
    const token = signAccessToken(USER_ID, SECRET);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});

describe('signRefreshToken', () => {
  it('returns a non-empty string', () => {
    const token = signRefreshToken(USER_ID, SECRET);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});

describe('verifyToken', () => {
  it('access token round-trip returns { userId, type: "access" }', () => {
    const token = signAccessToken(USER_ID, SECRET);
    const result = verifyToken(token, SECRET);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe(USER_ID);
    expect(result?.type).toBe('access');
  });

  it('refresh token round-trip returns { userId, type: "refresh" }', () => {
    const token = signRefreshToken(USER_ID, SECRET);
    const result = verifyToken(token, SECRET);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe(USER_ID);
    expect(result?.type).toBe('refresh');
  });

  it('expired token returns null', () => {
    // Sign with 0-second expiry — immediately expired
    const token = jwt.sign({ userId: USER_ID, type: 'access' }, SECRET, {
      expiresIn: 0,
    });
    const result = verifyToken(token, SECRET);
    expect(result).toBeNull();
  });

  it('wrong signature returns null', () => {
    const token = signAccessToken(USER_ID, SECRET);
    const result = verifyToken(token, 'completely-different-secret-key-32chars');
    expect(result).toBeNull();
  });

  it('malformed string returns null', () => {
    const result = verifyToken('not.a.valid.jwt.string', SECRET);
    expect(result).toBeNull();
  });
});
