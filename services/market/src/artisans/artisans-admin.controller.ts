import { Roles } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { ArtisansService } from './artisans.service';
import { QueryArtisansDto } from './dto';

@Controller('admin/artisans')
@Roles(UserRole.ADMIN)
export class ArtisansAdminController {
  constructor(private readonly artisansService: ArtisansService) {}

  @Get()
  adminListArtisans(@Query() query: QueryArtisansDto) {
    return this.artisansService.adminListArtisans(query);
  }

  @Patch(':id/verify')
  adminVerifyArtisan(@Param('id', ParseUUIDPipe) id: string) {
    return this.artisansService.adminVerifyArtisan(id);
  }

  @Delete(':id')
  adminDeleteArtisan(@Param('id', ParseUUIDPipe) id: string) {
    return this.artisansService.adminDeleteArtisan(id);
  }
}
