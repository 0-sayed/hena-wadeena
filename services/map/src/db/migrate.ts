import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'map, public' },
});
const db = drizzle(sql);

async function main() {
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS map`;
    await migrate(db, {
      migrationsFolder: './drizzle',
      migrationsTable: '__drizzle_migrations_map',
    });
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
