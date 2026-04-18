import type { Mock } from 'vitest';
import { vi } from 'vitest';

interface MockDbChain {
  select: Mock;
  from: Mock;
  where: Mock;
  limit: Mock;
  offset: Mock;
  count: Mock;
  insert: Mock;
  values: Mock;
  returning: Mock;
  onConflictDoNothing: Mock;
  update: Mock;
  delete: Mock;
  set: Mock;
  orderBy: Mock;
  execute: Mock;
  transaction: Mock;
  innerJoin: Mock;
  leftJoin: Mock;
  then: Mock;
}

/** Chain-style mock for Drizzle query builder. Shared across unit tests. */
export function createMockDb(): MockDbChain {
  const chain: MockDbChain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([]),
    offset: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue([{ count: 0 }]),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoNothing: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    orderBy: vi.fn(),
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    then: vi.fn(),
  };
  chain.transaction.mockImplementation(async (cb: (tx: MockDbChain) => Promise<unknown>) =>
    cb(chain),
  );
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.onConflictDoNothing.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.then.mockImplementation((resolve?: (value: unknown[]) => void) =>
    Promise.resolve([]).then(resolve),
  );
  return chain;
}
