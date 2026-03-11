import { INestApplication, Logger } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Configure common middleware and shutdown hooks on a NestJS app.
 * Call from each service's main.ts after NestFactory.create().
 */
export async function configureApp(
  app: INestApplication,
  options: { port: number; serviceName: string },
): Promise<void> {
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  (app.getHttpAdapter().getInstance() as { set(key: string, value: unknown): void }).set(
    'trust proxy',
    1,
  );
  app.enableCors();
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();

  await app.listen(options.port);
  logger.log(`${options.serviceName} running on :${options.port}`);
}
