import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { DesertTripsService } from './desert-trips.service';
import { AddBreadcrumbDto, CreateDesertTripDto } from './dto';

@Controller('bookings/:bookingId/desert-trip')
export class DesertTripsController {
  constructor(
    @Inject(DesertTripsService) private readonly desertTripsService: DesertTripsService,
  ) {}

  @Post()
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.CREATED)
  register(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: CreateDesertTripDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.desertTripsService.register(bookingId, user.sub, dto);
  }

  @Post('breadcrumb')
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.OK)
  addBreadcrumb(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: AddBreadcrumbDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.desertTripsService.addBreadcrumb(bookingId, user.sub, dto);
  }

  @Post('check-in')
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.OK)
  checkIn(@Param('bookingId', ParseUUIDPipe) bookingId: string, @CurrentUser() user: JwtPayload) {
    return this.desertTripsService.checkIn(bookingId, user.sub);
  }

  @Get()
  @Roles(UserRole.GUIDE, UserRole.TOURIST)
  findByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.desertTripsService.findByBooking(bookingId, user.sub, user.role as UserRole);
  }
}
