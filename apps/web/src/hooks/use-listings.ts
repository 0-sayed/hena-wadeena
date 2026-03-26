import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listingsAPI } from '@/services/api';

export function useListings(params?: { category?: string; district?: string; limit?: number }) {
  return useQuery({
    // Use existing queryKeys.market.listings() — no new namespace needed.
    queryKey: queryKeys.market.listings(params),
    queryFn: () => listingsAPI.getAll(params),
    staleTime: 2 * 60 * 1000,
  });
}
