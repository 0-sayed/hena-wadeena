import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  jobsAPI: {
    getAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getById: vi.fn().mockResolvedValue(null),
    getMyApplications: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/query-keys', () => ({
  queryKeys: {
    jobs: {
      all: (filters?: Record<string, unknown>) => ['jobs', filters] as const,
      detail: (id: string) => ['jobs', id] as const,
      myApplications: () => ['jobs', 'my-applications'] as const,
      myPosts: () => ['jobs', 'my-posts'] as const,
    },
  },
}));

let capturedOptions: Record<string, unknown> = {};
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    capturedOptions = options;
    return { data: undefined, isLoading: false };
  }),
  useMutation: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    capturedOptions = options;
    return { mutate: vi.fn(), isPending: false };
  }),
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
}));

import { useJobs, useJob, useMyApplications, useCreateJobMutation } from './use-jobs';

describe('useJobs', () => {
  it('passes filters to queryKey', () => {
    useJobs({ category: 'agriculture' });
    expect(capturedOptions.queryKey).toEqual(['jobs', { category: 'agriculture' }]);
  });

  it('is enabled by default', () => {
    useJobs();
    expect(capturedOptions.enabled).toBeUndefined();
  });
});

describe('useJob', () => {
  it('is disabled when id is undefined', () => {
    useJob(undefined);
    expect(capturedOptions.enabled).toBe(false);
  });

  it('is enabled when id is provided', () => {
    useJob('job-1');
    expect(capturedOptions.enabled).toBe(true);
  });
});

describe('useMyApplications', () => {
  it('is disabled when not authenticated', () => {
    useMyApplications(false);
    expect(capturedOptions.enabled).toBe(false);
  });

  it('is enabled when authenticated', () => {
    useMyApplications(true);
    expect(capturedOptions.enabled).toBe(true);
  });
});

describe('useCreateJobMutation', () => {
  it('exposes mutate function', () => {
    const result = useCreateJobMutation();
    expect(result.mutate).toBeDefined();
  });
});
