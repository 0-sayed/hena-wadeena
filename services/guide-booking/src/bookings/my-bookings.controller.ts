import { CurrentUser } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { GuidesService } from '../guides/guides.service';

import { BookingsService } from './bookings.service';
import { BookingFiltersDto, CancelBookingDto } from './dto';

@Controller('bookings')
export class MyBookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly guidesService: GuidesService,
  ) {}

  private async resolveCaller(user: JwtPayload) {
    const guideId =
      user.role === 'guide'
        ? await this.guidesService.resolveGuideId(user.sub).catch(() => undefined)
        : undefined;
    return { sub: user.sub, role: user.role, guideId };
  }

  @Get('mine')
  async findMine(@Query() filters: BookingFiltersDto, @CurrentUser() user: JwtPayload) {
    const caller = await this.resolveCaller(user);
    return this.bookingsService.findMyBookings(caller, filters);
  }

  @Patch(':id/confirm')
  async confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const caller = await this.resolveCaller(user);
    return this.bookingsService.transition(id, 'confirmed', caller);
  }

  @Patch(':id/start')
  async start(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const caller = await this.resolveCaller(user);
    return this.bookingsService.transition(id, 'in_progress', caller);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const caller = await this.resolveCaller(user);
    return this.bookingsService.transition(id, 'cancelled', caller, dto.cancelReason);
  }

  @Patch(':id/complete')
  async complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const caller = await this.resolveCaller(user);
    return this.bookingsService.transition(id, 'completed', caller);
  }
}
