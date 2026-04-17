import { configureApp } from '@hena-wadeena/nest-common';
import { resolveWorktreePort } from '@hena-wadeena/types';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await configureApp(app, {
    port: resolveWorktreePort(8003, process.env.GUIDE_BOOKING_PORT, process.env),
    serviceName: 'GuideBooking',
  });
}

void bootstrap();
