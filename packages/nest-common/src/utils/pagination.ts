import type { PaginatedResponse } from '@hena-wadeena/types';

export function paginate<T>(
  data: T[],
  total: number,
  offset: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  };
}
