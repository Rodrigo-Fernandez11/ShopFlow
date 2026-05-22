import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended';
import { type PrismaClient } from '@prisma/client';

/**
 * Returns a fully-typed deep mock of PrismaClient.
 * Use as a drop-in replacement for the prisma singleton in unit tests —
 * no real database connection is made.
 *
 * @example
 * const db = mockPrisma();
 * db.user.findUnique.mockResolvedValue({ id: '1', ... });
 */
export function mockPrisma(): DeepMockProxy<PrismaClient> {
  return mockDeep<PrismaClient>();
}
