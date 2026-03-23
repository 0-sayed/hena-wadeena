import { Module } from '@nestjs/common';

import { GuidesModule } from '../guides/guides.module';

import { AdminPackagesController } from './admin-packages.controller';
import { MyPackagesController } from './my-packages.controller';
import { TourPackagesController } from './tour-packages.controller';
import { TourPackagesService } from './tour-packages.service';

@Module({
  imports: [GuidesModule],
  controllers: [TourPackagesController, MyPackagesController, AdminPackagesController],
  providers: [TourPackagesService],
  exports: [TourPackagesService],
})
export class TourPackagesModule {}
