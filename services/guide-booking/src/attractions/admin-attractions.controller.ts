import { Roles } from '@hena-wadeena/nest-common';
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
  Query,
} from '@nestjs/common';

import { AttractionsService } from './attractions.service';
import {
  AdminAttractionFiltersDto,
  AttractionFiltersDto,
  CreateAttractionDto,
  UpdateAttractionDto,
  UploadUrlDto,
} from './dto';

@Roles(UserRole.ADMIN)
@Controller('admin/attractions')
export class AdminAttractionsController {
  constructor(@Inject(AttractionsService) private readonly attractionsService: AttractionsService) {}

  @Get()
  adminFindAll(
    @Query() filters: AttractionFiltersDto,
    @Query() adminFilters: AdminAttractionFiltersDto,
  ) {
    return this.attractionsService.adminFindAll(filters, adminFilters.status);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAttractionDto) {
    return this.attractionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttractionDto) {
    return this.attractionsService.update(id, dto);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.attractionsService.softDelete(id);
  }

  @Post(':id/upload-url')
  @HttpCode(HttpStatus.OK)
  getUploadUrl(@Param('id') id: string, @Body() dto: UploadUrlDto) {
    return this.attractionsService.getUploadUrl(id, dto);
  }
}
