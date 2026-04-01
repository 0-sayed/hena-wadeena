import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  SEED_PASSWORD,
  hashPassword,
  getLayer,
  logSummary,
} from '../../../../scripts/seed/seed-utils.js';

import { userKyc } from './schema/user-kyc.js';
import { users } from './schema/users.js';
import { essentialKycRecords } from './seed-data/kyc.js';
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
    avatarUrl: u.avatarUrl,
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
      avatarUrl: u.avatarUrl,
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

  // 3. KYC records — always seed essential KYC for admin moderation demo
  const kycResult = await db
    .insert(userKyc)
    .values(
      essentialKycRecords.map((kyc) => ({
        id: kyc.id,
        userId: kyc.userId,
        docType: kyc.docType,
        docUrl: kyc.docUrl,
        status: kyc.status,
        reviewedBy: kyc.reviewedBy,
        reviewedAt: kyc.reviewedAt,
        rejectionReason: kyc.rejectionReason,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: userKyc.id });

  logSummary('identity', layer, {
    users: essentialResult.length + showcaseCount,
    kyc: kycResult.length,
  });
}

main()
  .catch((error: unknown) => {
    console.error('Identity seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
