import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'guide_booking, public' },
});
const db = drizzle(sql);

async function main() {
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS guide_booking`;
    await migrate(db, {
      migrationsFolder: './drizzle',
      // Per-service table prevents cross-service migration collisions.
      // Safe because no prior deployment succeeded with the default table.
      migrationsTable: '__drizzle_migrations_guide_booking',
    });
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
