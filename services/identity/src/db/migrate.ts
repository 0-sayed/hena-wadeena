import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'identity, public' },
});
const db = drizzle(sql);

async function main() {
  try {
    console.warn('Running identity migrations...');
    await sql`CREATE SCHEMA IF NOT EXISTS identity`;
    await migrate(db, {
      migrationsFolder: './drizzle',
      // Per-service table prevents cross-service migration collisions.
      // Safe because no prior deployment succeeded with the default table.
      migrationsTable: '__drizzle_migrations_identity',
    });
    console.warn('Identity migrations complete.');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
