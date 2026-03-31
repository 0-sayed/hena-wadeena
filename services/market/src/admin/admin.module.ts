// services/market/src/admin/admin.module.ts
import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ListingsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
