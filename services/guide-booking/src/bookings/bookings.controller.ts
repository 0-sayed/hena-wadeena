import { CurrentUser, Roles } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { GuidesService } from '../guides/guides.service';

import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly guidesService: GuidesService,
  ) {}

  @Post()
  @Roles(UserRole.TOURIST, UserRole.STUDENT, UserRole.INVESTOR, UserRole.RESIDENT)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(dto, user.sub);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const guideId =
      user.role === 'guide'
        ? await this.guidesService.resolveGuideId(user.sub).catch((error) => {
            if (error instanceof NotFoundException) return undefined;
            throw error;
          })
        : undefined;

    return this.bookingsService.findById(id, {
      sub: user.sub,
      role: user.role,
      guideId,
    });
  }
}
