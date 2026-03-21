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
  update: Mock;
  set: Mock;
  orderBy: Mock;
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
    update: vi.fn(),
    set: vi.fn(),
    orderBy: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}
