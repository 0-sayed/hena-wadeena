import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { guidesAPI, type GuideFilters } from '@/services/api';
import { usePaginatedQuery } from './use-paginated-query';

export function useGuides(filters?: Omit<GuideFilters, 'page' | 'limit'>, limit?: number) {
  return usePaginatedQuery({
    queryKey: queryKeys.guides.all(filters),
    queryFn: (params) => guidesAPI.getAll(params),
    filters,
    limit,
    staleTime: 5 * 60 * 1000,
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
  return usePaginatedQuery({
    queryKey: queryKeys.guides.packages(guideId),
    queryFn: (params) => guidesAPI.getPackages(guideId, params),
    staleTime: 5 * 60 * 1000,
    enabled: !!guideId,
  });
}
