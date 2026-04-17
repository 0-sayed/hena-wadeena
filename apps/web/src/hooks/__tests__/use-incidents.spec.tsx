import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportIncident, useUpdateIncident } from '../use-incidents';

const mockReport = vi.fn();
const mockAdminUpdate = vi.fn();

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    incidentsAPI: {
      ...((actual as { incidentsAPI: object }).incidentsAPI ?? {}),
      report: (...args: unknown[]) => mockReport(...args),
      adminUpdate: (...args: unknown[]) => mockAdminUpdate(...args),
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

describe('incident mutations', () => {
  beforeEach(() => {
    mockReport.mockReset();
    mockAdminUpdate.mockReset();
    mockReport.mockResolvedValue({ id: 'incident-1' });
    mockAdminUpdate.mockResolvedValue({ id: 'incident-1' });
  });

  it('invalidates the public and personal incident caches after reporting', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReportIncident(), { wrapper });

    result.current.mutate({
      incidentType: 'litter',
      latitude: 27.03,
      longitude: 28.35,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenNthCalledWith(1, {
      queryKey: ['incidents', 'list'],
    });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, {
      queryKey: ['incidents', 'mine'],
    });
  });

  it('invalidates all incident caches after an admin update', async () => {
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateIncident(), { wrapper });

    result.current.mutate({
      id: 'incident-1',
      body: { status: 'resolved' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['incidents'],
    });
  });
});
