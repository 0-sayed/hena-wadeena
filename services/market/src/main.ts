import { configureApp } from '@hena-wadeena/nest-common';
import { resolveWorktreePort } from '@hena-wadeena/types';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await configureApp(app, {
    port: resolveWorktreePort(8002, process.env.MARKET_PORT ?? process.env.PORT, process.env),
    serviceName: 'Market',
  });
}

void bootstrap();
