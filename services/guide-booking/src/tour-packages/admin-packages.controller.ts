import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Controller, Get, Query } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { PackageFiltersDto } from './dto';
import { TourPackagesService } from './tour-packages.service';

const adminPackageFiltersSchema = z.object({
  status: z.enum(['active', 'inactive', 'deleted']).optional(),
});

class AdminPackageFiltersDto extends createZodDto(adminPackageFiltersSchema) {}

@Roles(UserRole.ADMIN)
@Controller('admin/packages')
export class AdminPackagesController {
  constructor(private readonly tourPackagesService: TourPackagesService) {}

  @Get()
  adminFindAll(@Query() filters: PackageFiltersDto, @Query() adminFilters: AdminPackageFiltersDto) {
    return this.tourPackagesService.adminFindAll(filters, adminFilters.status);
  }
}
