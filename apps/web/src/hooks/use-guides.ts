import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { guidesAPI, type GuideFilters } from '@/services/api';

export function useGuides(filters?: Omit<GuideFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.guides.all(filters),
    queryFn: ({ pageParam }) => guidesAPI.getAll({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    maxPages: 5,
  });
}

export function useGuide(id: string) {
  return useQuery({
    queryKey: queryKeys.guides.detail(id),
    queryFn: () => guidesAPI.getById(id),
    enabled: !!id,
  });
}

export function useGuidePackages(guideId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.guides.packages(guideId),
    queryFn: ({ pageParam }) => guidesAPI.getPackages(guideId, { page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    maxPages: 5,
    enabled: !!guideId,
  });
}
