import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { businessesAPI } from '@/services/api';
import { usePaginatedQuery } from './use-paginated-query';

export function useBusinesses(filters?: { category?: string; district?: string; q?: string }) {
  return usePaginatedQuery({
    queryKey: queryKeys.market.businesses(filters),
    queryFn: ({ page, limit, ...rest }) =>
      businessesAPI.getAll({ ...rest, offset: (page - 1) * limit, limit }),
    filters,
    staleTime: 10 * 60 * 1000,
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
