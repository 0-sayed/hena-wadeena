import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  priceAlertsAPI,
  type CreatePriceAlertRequest,
  type UpdatePriceAlertRequest,
} from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

export function usePriceAlerts() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.market.priceAlerts(),
    queryFn: priceAlertsAPI.list,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePriceAlertRequest) => priceAlertsAPI.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.priceAlerts() });
    },
  });
}

export function useUpdatePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePriceAlertRequest }) =>
      priceAlertsAPI.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.priceAlerts() });
    },
  });
}

export function useDeletePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => priceAlertsAPI.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.priceAlerts() });
    },
  });
}
