import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'identity' },
});
const db = drizzle(sql);

async function main() {
  try {
    console.log('Running identity migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Identity migrations complete.');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
