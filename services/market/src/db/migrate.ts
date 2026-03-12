import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'market' },
});
const db = drizzle(sql);

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  await sql.end();
}

main().catch(console.error);
