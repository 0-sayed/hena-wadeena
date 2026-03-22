import { useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { packagesAPI, type PackageFilters } from '@/services/api';

export function usePackages(filters?: Omit<PackageFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.packages.all(filters),
    queryFn: ({ pageParam }) => packagesAPI.getAll({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });
}
