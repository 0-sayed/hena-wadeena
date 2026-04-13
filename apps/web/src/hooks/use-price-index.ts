import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { priceIndexAPI } from '@/services/api';
import { usePaginatedQuery } from './use-paginated-query';

type PriceIndexFilters = { q?: string; category?: string; region?: string; price_type?: string };

export function usePriceIndex(filters?: PriceIndexFilters, limit?: number) {
  return usePaginatedQuery({
    queryKey: queryKeys.market.priceIndex(filters),
    queryFn: ({ page, limit: l, ...rest }) =>
      priceIndexAPI.getIndex({ ...rest, offset: (page - 1) * l, limit: l }),
    filters,
    limit,
    staleTime: 15 * 60 * 1000,
  });
}

export function usePriceIndexPage(filters?: PriceIndexFilters, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.market.priceIndex(filters), { page, limit }],
    queryFn: () => priceIndexAPI.getIndex({ ...filters, offset: (page - 1) * limit, limit }),
    placeholderData: keepPreviousData,
    staleTime: 15 * 60 * 1000,
  });
}

export function usePriceSummary() {
  return useQuery({
    queryKey: queryKeys.market.priceSummary(),
    queryFn: () => priceIndexAPI.getSummary(),
  });
}
