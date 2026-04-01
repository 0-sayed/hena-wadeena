import { useQuery } from '@tanstack/react-query';
import type { SearchResultType } from '@hena-wadeena/types';
import { queryKeys } from '@/lib/query-keys';
import { searchAPI } from '@/services/api';

export function useSearch(query: string, type?: SearchResultType) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.search.results(normalizedQuery, type ? { type } : undefined),
    queryFn: () => searchAPI.search(normalizedQuery, type),
    enabled: normalizedQuery.length > 0,
    staleTime: 60 * 1000,
  });
}
