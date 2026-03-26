import { InternalServerErrorException } from '@nestjs/common';
import { and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export function andRequired(...conditions: (SQL | undefined)[]): SQL {
  const result = and(...conditions);
  if (!result) throw new Error('and() returned undefined — no conditions provided');
  return result;
}

export function firstOrThrow<T>(rows: T[], message = 'Expected at least one row'): T {
  const row = rows[0];
  if (!row) throw new InternalServerErrorException(message);
  return row;
}

/** Escapes SQL LIKE wildcards (`%`, `_`) so they match literally. */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function isPgErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === code
  );
}

/** Checks whether a caught error is a PostgreSQL unique-constraint violation (23505). */
export const isUniqueViolation = (err: unknown): boolean => isPgErrorCode(err, '23505');

/** Checks whether a caught error is a PostgreSQL foreign-key violation (23503). */
export const isForeignKeyViolation = (err: unknown): boolean => isPgErrorCode(err, '23503');
