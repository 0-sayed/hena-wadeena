import type { PaginatedResponse } from '@hena-wadeena/types';
import {
  useInfiniteQuery,
  keepPreviousData,
  type QueryKey,
  type InfiniteData,
} from '@tanstack/react-query';

interface UsePaginatedQueryOptions<
  TItem,
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  queryKey: QueryKey;
  queryFn: (
    params: TFilters & { page: number; limit: number },
  ) => Promise<PaginatedResponse<TItem>>;
  filters?: TFilters;
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

interface UsePaginatedQueryResult<TItem> {
  data: TItem[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
  isError: boolean;
  error: Error | null;
}

export function usePaginatedQuery<
  TItem,
  TFilters extends Record<string, unknown> = Record<string, unknown>,
>(options: UsePaginatedQueryOptions<TItem, TFilters>): UsePaginatedQueryResult<TItem> {
  const limit = options.limit ?? 20;

  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    queryFn: ({ pageParam }) =>
      options.queryFn({
        ...options.filters,
        page: pageParam,
        limit,
      } as TFilters & { page: number; limit: number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<TItem>) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: options.enabled,
    staleTime: options.staleTime,
    select: (data: InfiniteData<PaginatedResponse<TItem>>) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      flat: data.pages.flatMap((p) => p.data),
      total: data.pages.at(-1)?.total ?? 0,
    }),
  });

  return {
    data: query.data?.flat ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}
