import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { artisanProfiles } from './artisan-profiles';

function extractColumnNames(node: unknown): string[] {
  if (node === null || typeof node !== 'object') {
    return [];
  }

  const maybeNamedNode = node as { name?: unknown; queryChunks?: unknown[] };
  const names =
    typeof maybeNamedNode.name === 'string' ? [maybeNamedNode.name] : [];
  const chunkNames = Array.isArray(maybeNamedNode.queryChunks)
    ? maybeNamedNode.queryChunks.flatMap((chunk) => extractColumnNames(chunk))
    : [];

  return [...names, ...chunkNames];
}

function extractSqlFragments(node: unknown): string[] {
  if (node === null || typeof node !== 'object') {
    return [];
  }

  const maybeSqlNode = node as { value?: unknown; queryChunks?: unknown[] };
  const values = Array.isArray(maybeSqlNode.value)
    ? maybeSqlNode.value.flatMap((chunk) =>
        typeof chunk === 'string' ? [chunk] : extractSqlFragments(chunk),
      )
    : typeof maybeSqlNode.value === 'string'
      ? [maybeSqlNode.value]
      : [];
  const chunkValues = Array.isArray(maybeSqlNode.queryChunks)
    ? maybeSqlNode.queryChunks.flatMap((chunk) => extractSqlFragments(chunk))
    : [];

  return [...values, ...chunkValues];
}

describe('artisanProfiles schema', () => {
  it('keeps the user_id uniqueness constraint scoped to active rows', () => {
    const userIdIndex = getTableConfig(artisanProfiles).indexes.find(
      (index) => index.config.name === 'artisan_profiles_user_id_idx',
    );

    expect(userIdIndex?.config.unique).toBe(true);
    expect(userIdIndex?.config.where).toBeDefined();
    expect(extractColumnNames(userIdIndex?.config.where)).toContain('deleted_at');
    expect(extractSqlFragments(userIdIndex?.config.where).join('').toLowerCase()).toContain(
      'is null',
    );
  });
});
