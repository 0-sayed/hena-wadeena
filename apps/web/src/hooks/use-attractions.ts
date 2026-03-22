import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { attractionsAPI, type AttractionFilters } from '@/services/api';

export function useAttractions(filters?: Omit<AttractionFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.tourism.attractions(filters),
    queryFn: ({ pageParam }) => attractionsAPI.getAll({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
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
