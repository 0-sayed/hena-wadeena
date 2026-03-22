import { PaginatedResponse } from '@hena-wadeena/types';
import { InternalServerErrorException } from '@nestjs/common';
import { SQL, and } from 'drizzle-orm';

/** Narrows `SQL | undefined` to `SQL` — safe when and() receives ≥1 condition. */
export function andRequired(...conditions: (SQL | undefined)[]): SQL {
  const result = and(...conditions);
  if (!result) throw new Error('and() returned undefined — no conditions provided');
  return result;
}

/** Extracts the first row or throws — for INSERT/UPDATE … RETURNING that must yield a row. */
export function firstOrThrow<T>(rows: T[], message = 'Expected at least one row'): T {
  const row = rows[0];
  if (!row) throw new InternalServerErrorException(message);
  return row;
}

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
