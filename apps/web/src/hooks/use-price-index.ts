import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { priceIndexAPI } from '@/services/api';
import { usePaginatedQuery } from './use-paginated-query';

export function usePriceIndex(filters?: { category?: string; region?: string }, limit?: number) {
  return usePaginatedQuery({
    queryKey: queryKeys.market.priceIndex(filters),
    queryFn: ({ page, limit: l, ...rest }) =>
      priceIndexAPI.getIndex({ ...rest, offset: (page - 1) * l, limit: l }),
    filters,
    limit,
    staleTime: 15 * 60 * 1000,
  });
}

export function usePriceSummary() {
  return useQuery({
    queryKey: queryKeys.market.priceSummary(),
    queryFn: () => priceIndexAPI.getSummary(),
  });
}
