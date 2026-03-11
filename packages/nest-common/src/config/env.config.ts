import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  SERVICE_NAME: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url(),
  DB_SCHEMA: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('me-south-1'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_PRESIGNED_URL_EXPIRES: z.coerce.number().default(3600),

  // Rate limiting
  THROTTLE_TTL_MS: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Trust proxy (required behind Nginx/ALB)
  TRUST_PROXY: z.coerce.number().default(1),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
