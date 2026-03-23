import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { CreatePackageDto, PackageUploadUrlDto, SetAttractionsDto, UpdatePackageDto } from './dto';
import { TourPackagesService } from './tour-packages.service';

const myPackagesQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

class MyPackagesQueryDto extends createZodDto(myPackagesQuerySchema) {}

@Roles(UserRole.GUIDE)
@Controller('my/packages')
export class MyPackagesController {
  constructor(@Inject(TourPackagesService) private readonly tourPackagesService: TourPackagesService) {}

  @Get()
  findMyPackages(@Query() query: MyPackagesQueryDto, @CurrentUser() user: JwtPayload) {
    return this.tourPackagesService.findMyPackages(user.sub, query.status, query.page, query.limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePackageDto, @CurrentUser() user: JwtPayload) {
    return this.tourPackagesService.create(dto, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePackageDto, @CurrentUser() user: JwtPayload) {
    return this.tourPackagesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tourPackagesService.softDelete(id, user.sub);
  }

  @Post(':id/upload-url')
  @HttpCode(HttpStatus.CREATED)
  getUploadUrl(
    @Param('id') id: string,
    @Body() dto: PackageUploadUrlDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tourPackagesService.getUploadUrl(id, user.sub, dto);
  }

  @Put(':id/attractions')
  setAttractions(
    @Param('id') id: string,
    @Body() dto: SetAttractionsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tourPackagesService.setAttractions(id, user.sub, dto);
  }
}
