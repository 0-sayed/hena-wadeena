/**
 * db-reset.ts
 *
 * Drops all service schemas and clears Drizzle migration tracking so that
 * a subsequent `db:migrate` starts from a blank slate.
 *
 * Usage (from monorepo root):
 *   node --env-file .env --import tsx scripts/db-reset.ts
 *
 * Env vars:
 *   DATABASE_URL_LOCAL  – preferred; postgres reachable from the host (localhost)
 *   DATABASE_URL        – fallback; Docker-internal hostname works from containers only
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL_LOCAL or DATABASE_URL is required');

const sql = postgres(connectionString, { max: 1 });

const TRACKING_TABLES = [
  { schema: 'drizzle', name: '__drizzle_migrations_identity' },
  { schema: 'drizzle', name: '__drizzle_migrations_market' },
  { schema: 'drizzle', name: '__drizzle_migrations_guide_booking' },
  { schema: 'drizzle', name: '__drizzle_migrations_map' },
] as const;

async function main() {
  console.warn('[db-reset] Dropping service schemas...');
  await sql`DROP SCHEMA IF EXISTS identity CASCADE`;
  await sql`DROP SCHEMA IF EXISTS market CASCADE`;
  await sql`DROP SCHEMA IF EXISTS guide_booking CASCADE`;
  await sql`DROP SCHEMA IF EXISTS map CASCADE`;
  await sql`DROP SCHEMA IF EXISTS ai CASCADE`;
  console.warn('[db-reset] Schemas dropped.');

  // Clear Drizzle migration tracking so the next `db:migrate` re-applies all
  // migrations. The tracking tables live in the shared `drizzle` schema which
  // survives schema drops.
  for (const { schema, name } of TRACKING_TABLES) {
    await sql`TRUNCATE ${sql(schema)}.${sql(name)}`;
    console.warn(`[db-reset] Cleared ${schema}.${name}`);
  }

  console.warn('[db-reset] Done. Run db:migrate then db:seed to restore data.');
  await sql.end();
}

main().catch((err: unknown) => {
  console.error('[db-reset] Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
