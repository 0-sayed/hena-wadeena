import { DrizzleModule, HealthModule } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    DrizzleModule.forRoot({
      connectionString: process.env.DATABASE_URL ?? '',
      schema: 'market',
    }),
    HealthModule,
  ],
})
export class AppModule {}
