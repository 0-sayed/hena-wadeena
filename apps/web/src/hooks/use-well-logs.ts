import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { type WellLogCreateRequest, wellLogsAPI } from '@/services/api';

import { useAuth } from './use-auth';

export function useWellLogSummary() {
  const { isAuthenticated, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.wellLogs.summary(user?.id),
    queryFn: () => wellLogsAPI.getSummary(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateWellLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (body: WellLogCreateRequest) => wellLogsAPI.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wellLogs.summary(user?.id) });
    },
  });
}
