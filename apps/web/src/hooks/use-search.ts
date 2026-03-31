import { useQuery } from '@tanstack/react-query';
import type { SearchResultType } from '@hena-wadeena/types';
import { queryKeys } from '@/lib/query-keys';
import { searchAPI } from '@/services/api';

export function useSearch(query: string, type?: SearchResultType) {
  return useQuery({
    queryKey: queryKeys.search.results(query, type ? { type } : undefined),
    queryFn: () => searchAPI.search(query, type),
    enabled: query.length > 0,
    staleTime: 60 * 1000,
  });
}
