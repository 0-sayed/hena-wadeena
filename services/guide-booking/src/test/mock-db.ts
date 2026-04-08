import { vi } from 'vitest';

export type MockChain = Record<string, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

const CHAIN_METHODS = [
  'select',
  'from',
  'where',
  'orderBy',
  'limit',
  'offset',
  'insert',
  'values',
  'returning',
  'update',
  'set',
  'delete',
  'inArray',
  'innerJoin',
  'onConflictDoNothing',
] as const;

export function createMockDb(): MockChain {
  const chain = {} as MockChain;

  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = vi
    .fn()
    .mockImplementation((onFulfilled: (v: unknown[]) => unknown) =>
      Promise.resolve([]).then(onFulfilled),
    );

  chain.execute = vi.fn().mockResolvedValue([]);

  chain.transaction = vi.fn().mockImplementation((cb: (tx: MockChain) => unknown) => cb(chain));

  return chain;
}
