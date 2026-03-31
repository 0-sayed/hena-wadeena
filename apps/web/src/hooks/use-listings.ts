import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listingsAPI } from '@/services/api';

export function useListings(params?: { category?: string; district?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.market.listings(params),
    queryFn: () => listingsAPI.getAll(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.market.listing(id) : ['market', 'listings', 'missing-id'],
    queryFn: () => listingsAPI.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}
