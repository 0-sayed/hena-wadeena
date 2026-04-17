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

describe('artisanProfiles schema', () => {
  it('keeps the user_id uniqueness constraint scoped to active rows', () => {
    const userIdIndex = getTableConfig(artisanProfiles).indexes.find(
      (index) => index.config.name === 'artisan_profiles_user_id_idx',
    );

    expect(userIdIndex?.config.unique).toBe(true);
    expect(userIdIndex?.config.where).toBeDefined();
    expect(extractColumnNames(userIdIndex?.config.where)).toContain('deleted_at');
  });
});
