import {
  DRIZZLE_CLIENT,
  RedisStreamsService,
  generateId,
  paginate,
} from '@hena-wadeena/nest-common';
import { EVENTS } from '@hena-wadeena/types';
import type {
  BookingCancelledEventPayload,
  BookingEventPayload,
  PaginatedResponse,
} from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getTableColumns } from 'drizzle-orm/utils';

import { bookings, guideAvailability, guides, tourPackages } from '../db/schema/index';

import { validateTransition } from './booking-state-machine';
import type { CreateBookingDto } from './dto';

type Booking = typeof bookings.$inferSelect;
type BookingStatus = typeof bookings.$inferSelect.status;
type BookingListItem = Booking & {
  packageTitleAr: string | null;
  packageTitleEn: string | null;
};

export interface BookingCaller {
  sub: string;
  role: string;
  guideId?: string;
}

interface BookingFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  offset: number;
  limit: number;
}

const ACTIVE_SLOT_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'in_progress'];
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class BookingsService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  async create(dto: CreateBookingDto, touristId: string): Promise<Booking> {
    const [pkg] = await this.db
      .select()
      .from(tourPackages)
      .where(
        and(
          eq(tourPackages.id, dto.packageId),
          eq(tourPackages.status, 'active'),
          isNull(tourPackages.deletedAt),
        ),
      )
      .limit(1);

    if (!pkg) throw new NotFoundException('Tour package not found');

    const [guide] = await this.db
      .select()
      .from(guides)
      .where(and(eq(guides.id, pkg.guideId), isNull(guides.deletedAt)))
      .limit(1);

    if (!guide) throw new NotFoundException('Guide not found');
    if (!guide.active || !guide.licenseVerified) {
      throw new BadRequestException('Guide is not available for bookings');
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    if (dto.bookingDate <= today) {
      throw new BadRequestException('Booking date must be in the future');
    }

    const [blocked] = await this.db
      .select()
      .from(guideAvailability)
      .where(
        and(
          eq(guideAvailability.guideId, pkg.guideId),
          eq(guideAvailability.date, dto.bookingDate),
          eq(guideAvailability.isBlocked, true),
        ),
      )
      .limit(1);

    if (blocked) throw new ConflictException('Guide is not available on this date');

    if (dto.peopleCount > pkg.maxPeople) {
      throw new BadRequestException(`People count exceeds package maximum of ${pkg.maxPeople}`);
    }

    const [conflictingBooking] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.guideId, pkg.guideId),
          eq(bookings.bookingDate, dto.bookingDate),
          eq(bookings.startTime, dto.startTime),
          inArray(bookings.status, ACTIVE_SLOT_STATUSES),
        ),
      )
      .limit(1);

    if (conflictingBooking) {
      throw new ConflictException('This time slot is already booked');
    }

    const totalPrice = pkg.price * dto.peopleCount;
    const id = generateId();

    let row: Booking | undefined;
    try {
      [row] = await this.db
        .insert(bookings)
        .values({
          id,
          packageId: dto.packageId,
          guideId: pkg.guideId,
          touristId,
          bookingDate: dto.bookingDate,
          startTime: dto.startTime,
          peopleCount: dto.peopleCount,
          totalPrice,
          status: 'pending',
          notes: dto.notes ?? null,
        })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('This time slot is already booked');
      }
      throw error;
    }

    if (!row) throw new Error('Insert did not return a row');

    await this.redisStreams.publish(
      EVENTS.BOOKING_REQUESTED,
      this.buildBookingEventPayload(row, {
        guideUserId: guide.userId,
        packageTitleAr: pkg.titleAr,
        packageTitleEn: pkg.titleEn ?? '',
      }) as Record<string, string>,
    );

    return row;
  }

  private assertParticipant(booking: Booking, caller: BookingCaller): void {
    if (caller.role === 'admin') return;
    if (booking.touristId === caller.sub) return;
    if (booking.guideId === caller.guideId) return;
    throw new ForbiddenException('You are not authorized to access this booking');
  }

  async findById(id: string, caller: BookingCaller): Promise<Booking> {
    const [row] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (!row) throw new NotFoundException(`Booking not found: ${id}`);
    this.assertParticipant(row, caller);
    return row;
  }

  async transition(
    id: string,
    targetStatus: string,
    caller: BookingCaller,
    cancelReason?: string,
  ): Promise<Booking> {
    const [booking] = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

    if (!booking) throw new NotFoundException(`Booking not found: ${id}`);
    this.assertParticipant(booking, caller);

    const transitionDef = validateTransition(booking.status, targetStatus);

    // confirm/start/complete are guide-only actions
    if (['confirmed', 'in_progress', 'completed'].includes(targetStatus)) {
      if (booking.guideId !== caller.guideId) {
        throw new ForbiddenException('Only the booking guide can perform this action');
      }
    }

    // cancel from in_progress is guide/admin only
    if (targetStatus === 'cancelled' && booking.status === 'in_progress') {
      if (caller.role !== 'admin' && booking.guideId !== caller.guideId) {
        throw new ForbiddenException('Only the guide or admin can cancel an in-progress tour');
      }
    }

    // start only allowed on booking date
    if (targetStatus === 'in_progress') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
      if (booking.bookingDate !== today) {
        throw new BadRequestException('Tour can only be started on the booking date');
      }
    }

    // cancel requires a reason
    if (targetStatus === 'cancelled' && !cancelReason?.trim()) {
      throw new BadRequestException('cancelReason is required when cancelling a booking');
    }

    // Resolve event context BEFORE mutating state — otherwise a missing guide/
    // package row would 404 after the status has already been committed, leaving
    // the caller with a failure response but the transition silently applied
    // (and no event published to trigger refunds/notifications).
    let guide: { userId: string } | undefined;
    let pkg: { titleAr: string; titleEn: string | null } | undefined;
    if (transitionDef.event) {
      [guide] = await this.db
        .select({ userId: guides.userId })
        .from(guides)
        .where(eq(guides.id, booking.guideId))
        .limit(1);
      [pkg] = await this.db
        .select({ titleAr: tourPackages.titleAr, titleEn: tourPackages.titleEn })
        .from(tourPackages)
        .where(eq(tourPackages.id, booking.packageId))
        .limit(1);

      if (!guide || !pkg) {
        throw new NotFoundException('Booking event context not found');
      }
    }

    const updatePayload: Partial<typeof bookings.$inferInsert> = {
      status: targetStatus as BookingStatus,
      updatedAt: new Date(),
    };

    if (targetStatus === 'cancelled') {
      updatePayload.cancelledAt = new Date();
      updatePayload.cancelReason = cancelReason ?? null;
    }

    // Optimistic concurrency: ensure status hasn't changed since we read it
    const [updated] = await this.db
      .update(bookings)
      .set(updatePayload)
      .where(and(eq(bookings.id, id), eq(bookings.status, booking.status)))
      .returning();

    if (!updated) throw new ConflictException('Booking was modified concurrently, please retry');

    if (transitionDef.event && guide && pkg) {
      const payload =
        targetStatus === 'cancelled'
          ? this.buildBookingCancelledEventPayload(
              updated,
              {
                guideUserId: guide.userId,
                packageTitleAr: pkg.titleAr,
                packageTitleEn: pkg.titleEn ?? '',
              },
              {
                cancellationReason: cancelReason ?? '',
                cancelledByRole: caller.role,
                cancelledByUserId: caller.sub,
              },
            )
          : this.buildBookingEventPayload(updated, {
              guideUserId: guide.userId,
              packageTitleAr: pkg.titleAr,
              packageTitleEn: pkg.titleEn ?? '',
            });

      await this.redisStreams.publish(transitionDef.event, payload as Record<string, string>);
    }

    return updated;
  }

  private buildBookingEventPayload(
    booking: Pick<Booking, 'id' | 'packageId' | 'guideId' | 'touristId' | 'totalPrice'>,
    context: {
      guideUserId: string;
      packageTitleAr: string;
      packageTitleEn: string;
    },
  ): BookingEventPayload {
    return {
      bookingId: booking.id,
      packageId: booking.packageId,
      guideProfileId: booking.guideId,
      guideUserId: context.guideUserId,
      touristUserId: booking.touristId,
      packageTitleAr: context.packageTitleAr,
      packageTitleEn: context.packageTitleEn,
      totalPrice: booking.totalPrice.toString(),
    };
  }

  private buildBookingCancelledEventPayload(
    booking: Pick<Booking, 'id' | 'packageId' | 'guideId' | 'touristId' | 'totalPrice'>,
    context: {
      guideUserId: string;
      packageTitleAr: string;
      packageTitleEn: string;
    },
    cancellation: {
      cancellationReason: string;
      cancelledByRole: string;
      cancelledByUserId: string;
    },
  ): BookingCancelledEventPayload {
    return {
      ...this.buildBookingEventPayload(booking, context),
      cancellationReason: cancellation.cancellationReason,
      cancelledByRole: cancellation.cancelledByRole,
      cancelledByUserId: cancellation.cancelledByUserId,
    };
  }

  async findMyBookings(
    caller: BookingCaller,
    filters: BookingFilters,
  ): Promise<PaginatedResponse<BookingListItem>> {
    const ownerCondition =
      caller.role === 'guide' && caller.guideId
        ? eq(bookings.guideId, caller.guideId)
        : eq(bookings.touristId, caller.sub);

    return this.findBookings([ownerCondition], filters);
  }

  async adminFindAll(filters: BookingFilters): Promise<PaginatedResponse<BookingListItem>> {
    return this.findBookings([], filters);
  }

  private async findBookings(
    baseConditions: SQL[],
    filters: BookingFilters,
  ): Promise<PaginatedResponse<BookingListItem>> {
    const conditions = [...baseConditions];

    if (filters.status) {
      conditions.push(eq(bookings.status, filters.status as BookingStatus));
    }
    if (filters.fromDate) {
      conditions.push(gte(bookings.bookingDate, filters.fromDate));
    }
    if (filters.toDate) {
      conditions.push(lte(bookings.bookingDate, filters.toDate));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const { offset } = filters;

    const [data, [countRow]] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(bookings),
          packageTitleAr: tourPackages.titleAr,
          packageTitleEn: tourPackages.titleEn,
        })
        .from(bookings)
        .leftJoin(tourPackages, eq(bookings.packageId, tourPackages.id))
        .where(where)
        .orderBy(desc(bookings.createdAt))
        .limit(filters.limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`COUNT(*)::int` })
        .from(bookings)
        .where(where),
    ]);

    return paginate(data, countRow?.total ?? 0, offset, filters.limit);
  }
}
