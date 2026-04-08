import type { JwtPayload } from '@hena-wadeena/nest-common';
import { CurrentUser } from '@hena-wadeena/nest-common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreatePriceAlertDto } from './dto/create-price-alert.dto';
import { UpdatePriceAlertDto } from './dto/update-price-alert.dto';
import { PriceAlertsService } from './price-alerts.service';

@Controller('price-alerts')
export class PriceAlertsController {
  constructor(
    @Inject(PriceAlertsService) private readonly priceAlertsService: PriceAlertsService,
  ) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePriceAlertDto) {
    return this.priceAlertsService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.priceAlertsService.findAllForUser(user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceAlertDto,
  ) {
    return this.priceAlertsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.priceAlertsService.remove(id, user.sub);
  }
}
