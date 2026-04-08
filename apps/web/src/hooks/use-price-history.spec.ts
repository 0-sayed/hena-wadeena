import { describe, it, expect, vi } from 'vitest';

// We test the hook configuration by inspecting what useQuery receives.
// This avoids needing a full React render environment.

vi.mock('@/services/api', () => ({
  commoditiesAPI: {
    getPriceHistory: vi.fn().mockResolvedValue({
      commodity: { id: 'c1', nameAr: 'تمور', nameEn: 'Dates', unit: 'kg' },
      data: [],
      period: '30d',
      region: null,
      priceType: null,
    }),
  },
}));

vi.mock('@/lib/query-keys', () => ({
  queryKeys: {
    market: {
      priceHistory: (id: string, params?: Record<string, unknown>) =>
        ['market', 'commodities', id, 'price-history', params] as const,
    },
  },
}));

let capturedOptions: Record<string, unknown> = {};
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    capturedOptions = options;
    return { data: undefined, isLoading: false };
  }),
}));

import { usePriceHistory } from './use-price-history';

describe('usePriceHistory', () => {
  it('is disabled when commodityId is undefined', () => {
    usePriceHistory(undefined);
    expect(capturedOptions.enabled).toBe(false);
  });

  it('is enabled and sets correct staleTime when commodityId is provided', () => {
    usePriceHistory('c1', { period: '30d' });
    expect(capturedOptions.enabled).toBe(true);
    expect(capturedOptions.staleTime).toBe(5 * 60 * 1000);
  });
});
