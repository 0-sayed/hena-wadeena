import { Logger } from '@nestjs/common';
import helmet from 'helmet';

const DEFAULT_REQUEST_BODY_LIMIT = '10mb';

interface HttpAdapterInstance {
  set(key: string, value: unknown): void;
}

interface ConfigurableNestApp {
  use(...args: unknown[]): void;
  getHttpAdapter(): { getInstance(): HttpAdapterInstance };
  setGlobalPrefix(prefix: string, options: { exclude: string[] }): void;
  enableShutdownHooks(): void;
  listen(port: number): Promise<void>;
}

interface BodyParserCapableApp extends ConfigurableNestApp {
  useBodyParser(
    parserType: 'json' | 'urlencoded',
    options: { limit: string; extended?: boolean },
  ): void;
}

function isBodyParserCapableApp(app: ConfigurableNestApp): app is BodyParserCapableApp {
  return typeof Reflect.get(app, 'useBodyParser') === 'function';
}

function getRequestBodyLimit(): string {
  const configuredLimit = process.env.REQUEST_BODY_LIMIT?.trim();
  return configuredLimit && configuredLimit.length > 0
    ? configuredLimit
    : DEFAULT_REQUEST_BODY_LIMIT;
}

/**
 * Configure common middleware and shutdown hooks on a NestJS app.
 * Call from each service's main.ts after NestFactory.create().
 */
export async function configureApp(
  app: ConfigurableNestApp,
  options: { port: number; serviceName: string },
): Promise<void> {
  const logger = new Logger('Bootstrap');
  const requestBodyLimit = getRequestBodyLimit();

  app.use(helmet());
  if (isBodyParserCapableApp(app)) {
    app.useBodyParser('json', { limit: requestBodyLimit });
    app.useBodyParser('urlencoded', { extended: true, limit: requestBodyLimit });
  }
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();

  await app.listen(options.port);
  logger.log(`${options.serviceName} running on :${options.port}`);
}
