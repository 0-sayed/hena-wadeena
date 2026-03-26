import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { attractionsAPI, type AttractionFilters } from '@/services/api';
import { usePaginatedQuery } from './use-paginated-query';

export function useAttractions(
  filters?: Omit<AttractionFilters, 'page' | 'limit'>,
  limit?: number,
) {
  return usePaginatedQuery({
    queryKey: queryKeys.tourism.attractions(filters),
    queryFn: (params) => attractionsAPI.getAll(params),
    filters,
    limit,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAttraction(slug: string) {
  return useQuery({
    queryKey: queryKeys.tourism.attraction(slug),
    queryFn: () => attractionsAPI.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useNearbyAttractions(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.tourism.attraction(slug), 'nearby'] as const,
    queryFn: () => attractionsAPI.getNearby(slug),
    enabled: !!slug,
  });
}
