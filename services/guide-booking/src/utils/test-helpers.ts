import { vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

export interface MockDbChain {
  select: MockFn;
  from: MockFn;
  where: MockFn;
  limit: MockFn;
  offset: MockFn;
  insert: MockFn;
  values: MockFn;
  returning: MockFn;
  update: MockFn;
  set: MockFn;
  orderBy: MockFn;
  execute: MockFn;
  transaction: MockFn;
  innerJoin: MockFn;
  delete: MockFn;
  then: MockFn;
}

export function createMockDb(): MockDbChain {
  const select = vi.fn();
  const from = vi.fn();
  const where = vi.fn();
  const limit = vi.fn();
  const offset = vi.fn();
  const insert = vi.fn();
  const values = vi.fn();
  const returning = vi.fn().mockResolvedValue([]);
  const update = vi.fn();
  const set = vi.fn();
  const orderBy = vi.fn();
  const execute = vi.fn().mockResolvedValue([]);
  const innerJoin = vi.fn();
  const deleteMethod = vi.fn();
  const then = vi.fn().mockImplementation((resolve?: (v: unknown[]) => void) => {
    return Promise.resolve([]).then(resolve);
  });
  const transaction = vi.fn();

  const chain: MockDbChain = {
    select,
    from,
    where,
    limit,
    offset,
    insert,
    values,
    returning,
    update,
    set,
    orderBy,
    execute,
    transaction,
    innerJoin,
    delete: deleteMethod,
    then,
  };

  // Wire up chainable return values
  select.mockReturnValue(chain);
  from.mockReturnValue(chain);
  where.mockReturnValue(chain);
  limit.mockReturnValue(chain);
  offset.mockReturnValue(chain);
  insert.mockReturnValue(chain);
  values.mockReturnValue(chain);
  update.mockReturnValue(chain);
  set.mockReturnValue(chain);
  orderBy.mockReturnValue(chain);
  innerJoin.mockReturnValue(chain);
  deleteMethod.mockReturnValue(chain);
  transaction.mockImplementation((cb: (tx: MockDbChain) => Promise<unknown>) => cb(chain));

  return chain;
}

export function createMockRedisStreams() {
  return {
    publish: vi.fn().mockResolvedValue('mock-stream-id'),
  };
}
