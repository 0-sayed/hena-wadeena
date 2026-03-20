import { CurrentUser, Public, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CommodityPricesService } from './commodity-prices.service';
import { BatchCreatePricesDto } from './dto/batch-create-prices.dto';
import { CreateCommodityPriceDto } from './dto/create-commodity-price.dto';
import { CreateCommodityDto } from './dto/create-commodity.dto';
import { QueryPriceHistoryDto } from './dto/query-price-history.dto';
import { QueryPriceIndexDto } from './dto/query-price-index.dto';
import { UpdateCommodityPriceDto } from './dto/update-commodity-price.dto';
import { UpdateCommodityDto } from './dto/update-commodity.dto';

// ---------------------------------------------------------------------------
// Commodities — public catalog + admin management
// ---------------------------------------------------------------------------

@Controller('commodities')
export class CommoditiesController {
  constructor(private readonly service: CommodityPricesService) {}

  // Static paths MUST come before /:id

  @Get()
  @Public()
  findAll(@Query() query: QueryPriceIndexDto) {
    return this.service.findAllCommodities(query);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCommodityDto, @CurrentUser() user: JwtPayload) {
    return this.service.createCommodity(dto, user.sub);
  }

  @Get(':id/price-history')
  @Public()
  getPriceHistory(@Param('id', ParseUUIDPipe) id: string, @Query() query: QueryPriceHistoryDto) {
    return this.service.getPriceHistory(id, query);
  }

  @Get(':id')
  @Public()
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findCommodityById(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivateCommodity(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCommodityDto) {
    return this.service.updateCommodity(id, dto);
  }
}

// ---------------------------------------------------------------------------
// Commodity Prices — admin price entry
// ---------------------------------------------------------------------------

@Controller('commodity-prices')
export class CommodityPricesAdminController {
  constructor(private readonly service: CommodityPricesService) {}

  // Static paths MUST come before /:id

  @Post('batch')
  @Roles(UserRole.ADMIN)
  batchCreate(@Body() dto: BatchCreatePricesDto, @CurrentUser() user: JwtPayload) {
    return this.service.batchCreatePrices(dto, user.sub);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateCommodityPriceDto, @CurrentUser() user: JwtPayload) {
    return this.service.createPrice(dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCommodityPriceDto) {
    return this.service.updatePrice(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deletePrice(id);
  }
}

// ---------------------------------------------------------------------------
// Price Index — public dashboard
// ---------------------------------------------------------------------------

@Controller('price-index')
export class PriceIndexController {
  constructor(private readonly service: CommodityPricesService) {}

  // Static paths MUST come before dynamic

  @Get('summary')
  @Public()
  getSummary() {
    return this.service.getPriceSummary();
  }

  @Get()
  @Public()
  getIndex(@Query() query: QueryPriceIndexDto) {
    return this.service.getPriceIndex(query);
  }
}
