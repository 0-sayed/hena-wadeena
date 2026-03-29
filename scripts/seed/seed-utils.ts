import { hash } from '@node-rs/argon2';
import { sql as sqlTag } from 'drizzle-orm';

/** Shared password for all seed accounts. Falls back to Test1234! for local dev only. */
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Test1234!';

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
};

/** Hash a password with the same Argon2id options as the app */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/** Parse --layer=showcase from CLI args. Defaults to 'essential'. */
export function getLayer(): 'essential' | 'showcase' {
  const arg = process.argv.find((a) => a.startsWith('--layer='));
  if (arg?.split('=')[1] === 'showcase') return 'showcase';
  return 'essential';
}

/**
 * PostGIS point literal for use in Drizzle raw SQL.
 * Returns a SQL fragment: ST_SetSRID(ST_MakePoint(lon, lat), 4326)
 */
export function point(lat: number, lon: number) {
  return sqlTag`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`;
}

/** Print a summary line to console */
export function logSummary(service: string, layer: string, counts: Record<string, number>) {
  const parts = Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  console.warn(`[${service}] Seeded (${layer}): ${parts}`);
}
