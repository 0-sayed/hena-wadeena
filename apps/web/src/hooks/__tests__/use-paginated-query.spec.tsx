import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { usePaginatedQuery } from '../use-paginated-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function makePage<T>(data: T[], page: number, hasMore: boolean): PaginatedResponse<T> {
  return { data, total: 100, page, limit: 20, hasMore };
}

describe('usePaginatedQuery', () => {
  it('returns flattened data from first page', async () => {
    const queryFn = vi.fn().mockResolvedValue(makePage(['a', 'b'], 1, true));

    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ['test'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.total).toBe(100);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('returns hasNextPage false when server says no more', async () => {
    const queryFn = vi.fn().mockResolvedValue(makePage(['a'], 1, false));

    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ['test-no-more'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('passes filters and page to queryFn', async () => {
    const queryFn = vi.fn().mockResolvedValue(makePage([], 1, false));

    renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ['test-filters', { area: 'kharga' }],
          queryFn,
          filters: { area: 'kharga' },
          limit: 10,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(queryFn).toHaveBeenCalledWith({
        area: 'kharga',
        page: 1,
        limit: 10,
      }),
    );
  });

  it('returns empty data when disabled', () => {
    const queryFn = vi.fn();

    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ['test-disabled'],
          queryFn,
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.data).toEqual([]);
    expect(queryFn).not.toHaveBeenCalled();
  });
});
