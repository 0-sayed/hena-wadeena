import { CurrentUser, JwtPayload } from '@hena-wadeena/nest-common';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CreateWellLogDto } from './dto/create-well-log.dto';
import { QueryWellLogsDto } from './dto/query-well-logs.dto';
import { WellLogsService } from './well-logs.service';

@Controller('well-logs')
export class WellLogsController {
  constructor(private readonly wellLogsService: WellLogsService) {}

  @Post()
  create(@Body() dto: CreateWellLogDto, @CurrentUser() user: JwtPayload) {
    return this.wellLogsService.create(dto, user.sub);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.wellLogsService.getSummary(user.sub);
  }

  @Get()
  findAll(@Query() query: QueryWellLogsDto, @CurrentUser() user: JwtPayload) {
    return this.wellLogsService.findAll(user.sub, query);
  }
}
