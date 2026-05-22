import { describe, it, expect, vi } from 'vitest';

// Mock the @prisma/client and adapter before importing the singleton
vi.mock('@prisma/client', () => {
  class PrismaClient {
    $disconnect = vi.fn().mockResolvedValue(undefined);
  }
  return { PrismaClient };
});

vi.mock('@prisma/adapter-pg', () => {
  class PrismaPg {
    constructor(_opts: unknown) {}
  }
  return { PrismaPg };
});

vi.mock('@config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  },
}));

describe('prisma singleton', () => {
  it('imports without runtime error', async () => {
    const { prisma } = await import('@shared/prisma.js');
    expect(prisma).toBeDefined();
  });

  it('is a truthy object (PrismaClient instance)', async () => {
    const { prisma } = await import('@shared/prisma.js');
    expect(typeof prisma).toBe('object');
    expect(prisma).not.toBeNull();
  });
});
