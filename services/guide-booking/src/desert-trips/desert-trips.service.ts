import { DRIZZLE_CLIENT, generateId } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { bookings, desertTrips, guides } from '../db/schema/index';

import type { AddBreadcrumbDto, CreateDesertTripDto } from './dto';

@Injectable()
export class DesertTripsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  private async assertGuideOwnership(
    bookingId: string,
    userId: string,
  ): Promise<{ booking: typeof bookings.$inferSelect; guideId: string }> {
    const [result] = await this.db
      .select({ booking: bookings, guideUserId: guides.userId, guideId: guides.id })
      .from(bookings)
      .innerJoin(guides, eq(bookings.guideId, guides.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!result) throw new NotFoundException(`Booking not found: ${bookingId}`);

    if (result.booking.status === 'cancelled') {
      throw new BadRequestException('Cannot perform desert trip actions on a cancelled booking');
    }

    if (result.guideUserId !== userId) {
      throw new ForbiddenException('Only the guide for this booking can perform this action');
    }

    return { booking: result.booking, guideId: result.guideId };
  }

  private async findTrip(bookingId: string): Promise<typeof desertTrips.$inferSelect | undefined> {
    const [trip] = await this.db
      .select()
      .from(desertTrips)
      .where(eq(desertTrips.bookingId, bookingId))
      .limit(1);
    return trip;
  }

  async register(
    bookingId: string,
    userId: string,
    dto: CreateDesertTripDto,
  ): Promise<typeof desertTrips.$inferSelect> {
    await this.assertGuideOwnership(bookingId, userId);

    const [row] = await this.db
      .insert(desertTrips)
      .values({
        id: generateId(),
        bookingId,
        expectedArrivalAt: new Date(dto.expectedArrivalAt),
        destinationName: dto.destinationName,
        emergencyContact: dto.emergencyContact,
        rangerStationName: dto.rangerStationName ?? null,
      })
      .onConflictDoNothing({ target: desertTrips.bookingId })
      .returning();

    if (!row) throw new ConflictException('A desert trip plan already exists for this booking');
    return row;
  }

  async addBreadcrumb(
    bookingId: string,
    userId: string,
    dto: AddBreadcrumbDto,
  ): Promise<typeof desertTrips.$inferSelect> {
    await this.assertGuideOwnership(bookingId, userId);

    const trip = await this.findTrip(bookingId);
    if (!trip) throw new NotFoundException('No desert trip plan found for this booking');
    if (trip.status === 'checked_in' || trip.status === 'resolved') {
      throw new BadRequestException('Cannot add breadcrumbs in current trip status');
    }

    const newCrumb = { lat: dto.lat, lng: dto.lng, ts: new Date().toISOString() };
    const [row] = await this.db
      .update(desertTrips)
      .set({
        gpsBreadcrumbs: sql`${desertTrips.gpsBreadcrumbs} || ${JSON.stringify([newCrumb])}::jsonb`,
        updatedAt: new Date(),
      })
      .where(and(eq(desertTrips.id, trip.id), eq(desertTrips.status, trip.status)))
      .returning();

    if (!row) throw new NotFoundException('Trip not found or state changed');
    return row;
  }

  async checkIn(bookingId: string, userId: string): Promise<typeof desertTrips.$inferSelect> {
    await this.assertGuideOwnership(bookingId, userId);

    const trip = await this.findTrip(bookingId);
    if (!trip) throw new NotFoundException('No desert trip plan found for this booking');
    if (trip.status === 'checked_in') {
      throw new ConflictException('Trip is already checked in');
    }
    if (trip.status === 'resolved') {
      throw new ConflictException('Cannot check in a resolved trip');
    }

    const [row] = await this.db
      .update(desertTrips)
      .set({ status: 'checked_in', checkedInAt: new Date(), updatedAt: new Date() })
      .where(and(eq(desertTrips.id, trip.id), eq(desertTrips.status, trip.status)))
      .returning();

    if (!row) throw new NotFoundException('Trip not found or state changed');
    return row;
  }

  async findByBooking(
    bookingId: string,
    userId: string,
    role: UserRole,
  ): Promise<typeof desertTrips.$inferSelect> {
    if (role === UserRole.GUIDE) {
      await this.assertGuideOwnership(bookingId, userId);
    } else {
      const [booking] = await this.db
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      if (!booking) throw new NotFoundException(`Booking not found: ${bookingId}`);
      if (booking.touristId !== userId) throw new ForbiddenException('Access denied');
    }

    const trip = await this.findTrip(bookingId);
    if (!trip) throw new NotFoundException('No desert trip plan found for this booking');
    return trip;
  }
}
