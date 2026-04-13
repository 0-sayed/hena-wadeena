import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePriceAlerts } from '../use-price-alerts';

const mockListAlerts = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');
  return {
    ...(actual as object),
    priceAlertsAPI: {
      list: (...args: unknown[]) => mockListAlerts(...args),
    },
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('usePriceAlerts', () => {
  beforeEach(() => {
    mockListAlerts.mockReset();
    mockUseAuth.mockReset();
  });

  it('stays idle when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePriceAlerts(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListAlerts).not.toHaveBeenCalled();
  });

  it('fetches alerts when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    const fakeAlert = {
      id: 'a1',
      commodityId: 'c1',
      thresholdPrice: 5000,
      direction: 'above',
      isActive: true,
      lastTriggeredAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    mockListAlerts.mockResolvedValue([fakeAlert]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePriceAlerts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe('a1');
  });
});
