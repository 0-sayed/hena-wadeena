import { queryKeys } from '@/lib/query-keys';
import { packagesAPI, type PackageFilters } from '@/services/api';
import { usePaginatedQuery } from './use-paginated-query';

export function usePackages(filters?: Omit<PackageFilters, 'page' | 'limit'>, limit?: number) {
  return usePaginatedQuery({
    queryKey: queryKeys.packages.all(filters),
    queryFn: (params) => packagesAPI.getAll(params),
    filters,
    limit,
    staleTime: 5 * 60 * 1000,
  });
}
