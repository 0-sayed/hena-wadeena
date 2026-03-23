import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { businessesAPI } from '@/services/api';

export function useBusinesses(filters?: {
  category?: string;
  district?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.businesses(filters),
    queryFn: () => businessesAPI.getAll(filters),
  });
}

export function useBusiness(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.market.business(id) : (['market', 'business', 'pending'] as const),
    queryFn: () => {
      if (!id) throw new Error('Business id is required');
      return businessesAPI.getById(id);
    },
    enabled: !!id,
  });
}
