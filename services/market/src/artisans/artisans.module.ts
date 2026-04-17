import { Module } from '@nestjs/common';

import { ArtisansAdminController } from './artisans-admin.controller';
import { ArtisansController } from './artisans.controller';
import { ArtisansService } from './artisans.service';
import { QrService } from './qr.service';

@Module({
  controllers: [ArtisansController, ArtisansAdminController],
  providers: [ArtisansService, QrService],
})
export class ArtisansModule {}
