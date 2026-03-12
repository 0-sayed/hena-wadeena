import { DrizzleModule, HealthModule } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

@Module({
  imports: [
    DrizzleModule.forRoot({
      connectionString,
      schema: 'market',
    }),
    HealthModule,
  ],
})
export class AppModule {}
