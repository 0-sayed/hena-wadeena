import { CurrentUser, Public, S3Service, generateId } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from '@nestjs/common';

import { CreateIncidentDto, IncidentFiltersDto, IncidentUploadUrlDto } from './dto';
import { IncidentsService } from './incidents.service';

@Controller('map/environmental-incidents')
export class IncidentsController {
  constructor(
    @Inject(IncidentsService) private readonly incidentsService: IncidentsService,
    @Inject(S3Service) private readonly s3: S3Service,
  ) {}

  @Public()
  @Get()
  findAll(@Query() filters: IncidentFiltersDto) {
    return this.incidentsService.findAll(filters);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: JwtPayload) {
    return this.incidentsService.create(user.sub, dto);
  }

  @Get('my')
  findMyIncidents(@Query() filters: IncidentFiltersDto, @CurrentUser() user: JwtPayload) {
    return this.incidentsService.findMyIncidents(user.sub, filters);
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.CREATED)
  getUploadUrl(@Body() dto: IncidentUploadUrlDto) {
    const key = `incidents/${generateId()}-${dto.filename}`;
    return this.s3.getPresignedUploadUrl({ key, contentType: dto.contentType });
  }
}
