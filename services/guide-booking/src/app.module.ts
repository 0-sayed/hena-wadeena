import { HealthModule } from '@hena-wadeena/nest-common';
import { Module } from '@nestjs/common';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
