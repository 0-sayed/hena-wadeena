import { vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

interface MockDbChain {
  select: MockFn;
  from: MockFn;
  where: MockFn;
  limit: MockFn;
  offset: MockFn;
  insert: MockFn;
  values: MockFn;
  onConflictDoNothing: MockFn;
  returning: MockFn;
  update: MockFn;
  set: MockFn;
  orderBy: MockFn;
  groupBy: MockFn;
  execute: MockFn;
  transaction: MockFn;
  innerJoin: MockFn;
  delete: MockFn;
  then: MockFn;
}

/**
 * Creates a mock Drizzle DB chain for unit tests.
 *
 * Chainable by default: select, from, where, offset, orderBy, insert, values, update, set,
 * innerJoin, delete.
 *
 * Terminal by default (resolve to `[]`): returning, execute.
 *
 * Override per-test with `.mockResolvedValueOnce(...)` or `.mockReturnValueOnce(...)`.
 */
export function createMockDb(): MockDbChain {
  const chain = {} as MockDbChain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.onConflictDoNothing = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue([]);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(chain);
  chain.execute = vi.fn().mockResolvedValue([]);
  chain.transaction = vi
    .fn()
    .mockImplementation((cb: (tx: MockDbChain) => Promise<unknown>) => cb(chain));
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  // Make the chain thenable — Drizzle query builders are thenable (await resolves them).
  // Default resolve to [] so `await db.select().from().where()` works without .limit()/.execute().
  chain.then = vi.fn().mockImplementation((resolve?: (v: unknown[]) => void) => {
    return Promise.resolve([]).then(resolve);
  });
  return chain;
}

interface MockRedis {
  get: MockFn;
  set: MockFn;
  del: MockFn;
  scan: MockFn;
}

interface MockRedisStreams {
  publish: MockFn;
}

export function createMockRedis(): MockRedis {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    scan: vi.fn().mockResolvedValue(['0', []]),
  };
}

export function createMockRedisStreams(): MockRedisStreams {
  return {
    publish: vi.fn().mockResolvedValue('mock-stream-id'),
  };
}
