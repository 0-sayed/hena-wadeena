import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { NvDistrict } from '@hena-wadeena/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/lib/query-keys';
import { useCreateWellLog, useWellLogSummary } from '../use-well-logs';

const mockGetSummary = vi.fn();
const mockCreate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');
  return {
    ...(actual as object),
    wellLogsAPI: {
      getSummary: (...args: unknown[]) => mockGetSummary(...args),
      create: (...args: unknown[]) => mockCreate(...args),
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

const fakeSummary = { months: [], solar: null };

describe('useWellLogSummary', () => {
  beforeEach(() => {
    mockGetSummary.mockReset();
    mockCreate.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockGetSummary.mockResolvedValue(fakeSummary);
  });

  it('fetchesSummaryWhenAuthenticated', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWellLogSummary(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetSummary).toHaveBeenCalled();
    expect(result.current.data).toEqual(fakeSummary);
  });

  it('doesNotFetchWhenUnauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWellLogSummary(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetSummary).not.toHaveBeenCalled();
  });

  it('usesWellLogsQueryKey', async () => {
    const { queryClient, wrapper } = createWrapper();
    renderHook(() => useWellLogSummary(), { wrapper });

    await waitFor(() =>
      expect(
        queryClient.getQueryCache().find({ queryKey: queryKeys.wellLogs.summary() }),
      ).toBeTruthy(),
    );
  });
});

describe('useCreateWellLog', () => {
  beforeEach(() => {
    mockGetSummary.mockReset();
    mockCreate.mockReset();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockGetSummary.mockResolvedValue(fakeSummary);
    mockCreate.mockResolvedValue({ id: 'log-1' });
  });

  it('callsCreateWithBody', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateWellLog(), { wrapper });

    const body = {
      area: NvDistrict.KHARGA,
      pump_hours: 6,
      kwh_consumed: 120,
      cost_piasters: 36000,
      logged_at: '2025-01-01',
    };

    result.current.mutate(body);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith(body);
  });

  it('invalidatesSummaryOnSuccess', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateWellLog(), { wrapper });

    result.current.mutate({
      area: NvDistrict.KHARGA,
      pump_hours: 6,
      kwh_consumed: 120,
      cost_piasters: 36000,
      logged_at: '2025-01-01',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.wellLogs.summary(),
    });
  });
});
