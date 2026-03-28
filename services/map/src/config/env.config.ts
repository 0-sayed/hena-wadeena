import { z } from 'zod';

/**
 * Map service env schema — same as the shared schema but without refresh-token
 * secrets (this service only verifies access tokens).
 */
const mapEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().optional(),
  SERVICE_NAME: z.string().min(1),

  DATABASE_URL: z.string().url(),
  DB_SCHEMA: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('me-south-1'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_PRESIGNED_URL_EXPIRES: z.coerce.number().default(3600),

  THROTTLE_TTL_MS: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  TRUST_PROXY: z.coerce.number().default(1),
});

export type MapEnv = z.infer<typeof mapEnvSchema>;

export function validateMapEnv(env: Record<string, unknown>): MapEnv {
  const result = mapEnvSchema.safeParse(env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
