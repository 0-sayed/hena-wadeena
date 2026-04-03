import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyBookings } from '../use-my-bookings';
import { queryKeys } from '@/lib/query-keys';

const mockGetMyBookings = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    bookingsAPI: {
      getMyBookings: (...args: unknown[]) => mockGetMyBookings(...args),
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

describe('useMyBookings', () => {
  beforeEach(() => {
    mockGetMyBookings.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockGetMyBookings.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    });
  });

  it('enables active freshness for authenticated booking dashboards', async () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useMyBookings(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
    expect(mockGetMyBookings).toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryCache().find({ queryKey: queryKeys.bookings.mine() })?.options as {
          refetchInterval?: number | false;
        }
      )?.refetchInterval,
    ).toBe(30_000);
  });

  it('disables polling when the user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useMyBookings(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMyBookings).not.toHaveBeenCalled();
    expect(
      (
        queryClient.getQueryCache().find({ queryKey: queryKeys.bookings.mine() })?.options as {
          refetchInterval?: number | false;
        }
      )?.refetchInterval,
    ).toBe(false);
  });
});
