import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsAPI } from '@/services/api';
import type { ApplicationStatus } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

// ── Queries ─────────────────────────────────────────────────────────────────

export function useJobs(filters?: {
  category?: string;
  area?: string;
  compensationType?: string;
  offset?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.jobs.all(filters as Record<string, unknown>),
    queryFn: () => jobsAPI.getAll(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id ?? ''),
    queryFn: () => jobsAPI.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.applications(jobId ?? ''),
    queryFn: () => jobsAPI.getApplications(jobId!),
    enabled: !!jobId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useMyApplications(isAuthenticated = true) {
  return useQuery({
    queryKey: queryKeys.jobs.myApplications(),
    queryFn: () => jobsAPI.getMyApplications(),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
  });
}

export function useMyPosts(isAuthenticated = true) {
  return useQuery({
    queryKey: queryKeys.jobs.myPosts(),
    queryFn: () => jobsAPI.getMyPosts(),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
  });
}

export function useUserReviews(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.jobs.userReviews(userId ?? ''),
    queryFn: () => jobsAPI.getUserReviews(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsAPI.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useApplyMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { noteAr?: string }) => jobsAPI.apply(jobId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myApplications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    },
  });
}

export function useUpdateApplicationMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) =>
      jobsAPI.updateApplication(jobId, appId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.applications(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myPosts() });
    },
  });
}

export function useWithdrawApplicationMutation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => jobsAPI.withdrawApplication(jobId, appId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myApplications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    },
  });
}

export function useSubmitReviewMutation(jobId: string, appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { rating: number; comment?: string }) =>
      jobsAPI.submitReview(jobId, appId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.reviews() });
    },
  });
}
