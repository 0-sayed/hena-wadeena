import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  SEED_PASSWORD,
  hashPassword,
  getLayer,
  logSummary,
} from '../../../../scripts/seed/seed-utils.js';

import { users } from './schema/users.js';
import { essentialUsers, showcaseUsers } from './seed-data/users.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const sql = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'identity, public' },
});
const db = drizzle(sql);

async function main() {
  const layer = getLayer();
  const passwordHash = await hashPassword(SEED_PASSWORD);

  // Always seed essential users
  const essentialRows = essentialUsers.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    fullName: u.fullName,
    displayName: u.displayName,
    passwordHash,
    role: u.role,
    status: u.status,
    language: u.language,
    verifiedAt: u.verifiedAt,
  }));

  const essentialResult = await db
    .insert(users)
    .values(essentialRows)
    .onConflictDoNothing()
    .returning({ id: users.id });

  let showcaseCount = 0;

  if (layer === 'showcase') {
    const showcaseRows = showcaseUsers.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.fullName,
      displayName: u.displayName,
      passwordHash,
      role: u.role,
      status: u.status,
      language: u.language,
      verifiedAt: u.verifiedAt,
    }));

    const showcaseResult = await db
      .insert(users)
      .values(showcaseRows)
      .onConflictDoNothing()
      .returning({ id: users.id });

    showcaseCount = showcaseResult.length;
  }

  logSummary('identity', layer, { users: essentialResult.length + showcaseCount });
  console.warn(`  Password for all accounts: ${SEED_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error('Identity seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
