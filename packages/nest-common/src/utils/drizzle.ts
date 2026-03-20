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
