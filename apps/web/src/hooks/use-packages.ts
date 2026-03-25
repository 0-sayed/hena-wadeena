import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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

export function usePackage(id: string) {
  return useQuery({
    queryKey: queryKeys.packages.detail(id),
    queryFn: () => packagesAPI.getById(id),
    enabled: !!id,
  });
}
