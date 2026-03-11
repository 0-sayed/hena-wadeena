import { configureApp } from '@hena-wadeena/nest-common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await configureApp(app, { port: Number(process.env.PORT) || 8002, serviceName: 'Market' });
}

void bootstrap();
