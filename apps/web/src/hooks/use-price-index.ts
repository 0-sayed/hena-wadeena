import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { priceIndexAPI } from '@/services/api';

export function usePriceIndex(filters?: {
  category?: string;
  region?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.priceIndex(filters),
    queryFn: () => priceIndexAPI.getIndex(filters),
  });
}

export function usePriceSummary() {
  return useQuery({
    queryKey: queryKeys.market.priceSummary(),
    queryFn: () => priceIndexAPI.getSummary(),
  });
}
