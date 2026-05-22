import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt.
 * Uses 12 salt rounds (good balance of security vs. performance).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 */
export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
