import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { type WellLogCreateRequest, wellLogsAPI } from '@/services/api';

import { useAuth } from './use-auth';

export function useWellLogSummary() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.wellLogs.summary(),
    queryFn: () => wellLogsAPI.getSummary(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateWellLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WellLogCreateRequest) => wellLogsAPI.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wellLogs.summary() });
    },
  });
}
