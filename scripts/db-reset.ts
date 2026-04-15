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
 *   ALLOW_DB_RESET=1    – override the localhost-only safety gate (use with care)
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL_LOCAL or DATABASE_URL is required');

// Safety gate: refuse to run against non-local hosts unless explicitly overridden.
const parsed = new URL(connectionString);
const allowedHosts = new Set(['localhost', '127.0.0.1', 'postgres']);
if (!allowedHosts.has(parsed.hostname) && process.env.ALLOW_DB_RESET !== '1') {
  throw new Error(
    `[db-reset] Refusing to run against host "${parsed.hostname}". ` +
      `Set ALLOW_DB_RESET=1 to override intentionally.`,
  );
}

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
  // survives schema drops. Guard each TRUNCATE against missing tables (fresh DB
  // or partially migrated state) since PostgreSQL TRUNCATE has no IF EXISTS.
  for (const { schema, name } of TRACKING_TABLES) {
    const [row] = await sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = ${schema} AND table_name = ${name}
    `;
    if (row) {
      await sql`TRUNCATE ${sql(schema)}.${sql(name)}`;
      console.warn(`[db-reset] Cleared ${schema}.${name}`);
    } else {
      console.warn(`[db-reset] Skipped ${schema}.${name} (not found)`);
    }
  }

  console.warn('[db-reset] Done. Run db:migrate then db:seed to restore data.');
  await sql.end();
}

main().catch((err: unknown) => {
  console.error('[db-reset] Failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
