import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { BookingsService } from './bookings.service';
import { BookingFiltersDto, CancelBookingDto } from './dto';

@Roles(UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(@Inject(BookingsService) private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Query() filters: BookingFiltersDto) {
    return this.bookingsService.adminFindAll(filters);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.transition(
      id,
      'cancelled',
      { sub: user.sub, role: user.role },
      dto.cancelReason,
    );
  }
}
