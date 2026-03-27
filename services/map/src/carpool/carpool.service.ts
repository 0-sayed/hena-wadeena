import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import type { PaginatedResponse } from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, gte, lt, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { carpoolPassengers, carpoolRides } from '../db/schema/index';
import { distanceTo, makePoint, withinRadius } from '../utils/postgis';

import type { CreateRideDto, JoinRideDto, RideFiltersDto } from './dto';

type Ride = typeof carpoolRides.$inferSelect;
type Passenger = typeof carpoolPassengers.$inferSelect;

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class CarpoolService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async findAll(filters: RideFiltersDto): Promise<PaginatedResponse<Ride>> {
    const where = this.buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;

    let orderBy: SQL = sql`${carpoolRides.departureTime} ASC`;
    if (filters.originLat != null && filters.originLng != null) {
      const point = makePoint(filters.originLng, filters.originLat);
      orderBy = distanceTo(carpoolRides.origin, point);
    }

    const [data, countRows] = await Promise.all([
      this.db
        .select()
        .from(carpoolRides)
        .where(where)
        .orderBy(orderBy)
        .limit(filters.limit)
        .offset(offset),
      this.db.select({ count: count() }).from(carpoolRides).where(where),
    ]);

    const total = countRows[0]?.count ?? 0;

    return {
      data,
      total,
      page: filters.page,
      limit: filters.limit,
      hasMore: offset + filters.limit < total,
    };
  }

  async findById(id: string, userId?: string): Promise<Ride & { passengers?: Passenger[] }> {
    const [ride] = await this.db.select().from(carpoolRides).where(eq(carpoolRides.id, id));

    if (!ride) throw new NotFoundException('Ride not found');

    if (userId && ride.driverId === userId) {
      const passengers = await this.db
        .select()
        .from(carpoolPassengers)
        .where(eq(carpoolPassengers.rideId, id));

      return { ...ride, passengers };
    }

    return ride;
  }

  async createRide(dto: CreateRideDto, driverId: string): Promise<Ride> {
    const rows = await this.db
      .insert(carpoolRides)
      .values({
        driverId,
        origin: { x: dto.origin.lng, y: dto.origin.lat },
        destination: { x: dto.destination.lng, y: dto.destination.lat },
        originName: dto.originName,
        destinationName: dto.destinationName,
        departureTime: dto.departureTime,
        seatsTotal: dto.seatsTotal,
        pricePerSeat: dto.pricePerSeat,
        notes: dto.notes,
        status: 'open',
      })
      .returning();

    const [row] = rows;
    if (!row) throw new NotFoundException('Ride not found after insert');
    return row;
  }

  async joinRide(rideId: string, userId: string, dto: JoinRideDto): Promise<Passenger> {
    const ride = await this.findRideInternal(rideId);

    if (ride.driverId === userId) {
      throw new BadRequestException('Cannot join your own ride');
    }

    if (ride.status !== 'open') {
      throw new BadRequestException('Ride is not open for joining');
    }

    const availableSeats = ride.seatsTotal - ride.seatsTaken;
    if (dto.seats > availableSeats) {
      throw new BadRequestException('Not enough available seats');
    }

    try {
      const rows = await this.db
        .insert(carpoolPassengers)
        .values({
          rideId,
          userId,
          seats: dto.seats,
          status: 'requested',
        })
        .returning();

      const [row] = rows;
      if (!row) throw new NotFoundException('Passenger not found after insert');
      return row;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Already requested to join this ride');
      }
      throw err;
    }
  }

  async confirmPassenger(
    rideId: string,
    passengerId: string,
    driverId: string,
  ): Promise<Passenger> {
    return this.db.transaction(async (tx) => {
      const passenger = await this.findPassengerInternal(passengerId, tx);
      const ride = await this.findRideInternal(rideId, tx);

      if (ride.driverId !== driverId) {
        throw new ForbiddenException('Only the ride driver can perform this action');
      }

      if (passenger.status !== 'requested') {
        throw new BadRequestException('Passenger is not in requested status');
      }

      const [updatedPassenger] = await tx
        .update(carpoolPassengers)
        .set({ status: 'confirmed' })
        .where(eq(carpoolPassengers.id, passengerId))
        .returning();

      const newSeatsTaken = ride.seatsTaken + passenger.seats;
      const newStatus = newSeatsTaken >= ride.seatsTotal ? 'full' : ride.status;

      await tx
        .update(carpoolRides)
        .set({ seatsTaken: newSeatsTaken, status: newStatus })
        .where(eq(carpoolRides.id, rideId));

      if (!updatedPassenger) throw new NotFoundException('Passenger not found after update');
      return updatedPassenger;
    });
  }

  async declinePassenger(
    rideId: string,
    passengerId: string,
    driverId: string,
  ): Promise<Passenger> {
    const passenger = await this.findPassengerInternal(passengerId);
    const ride = await this.findRideInternal(rideId);

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Only the ride driver can perform this action');
    }

    if (passenger.status !== 'requested') {
      throw new BadRequestException('Passenger is not in requested status');
    }

    const [updated] = await this.db
      .update(carpoolPassengers)
      .set({ status: 'declined' })
      .where(eq(carpoolPassengers.id, passengerId))
      .returning();

    if (!updated) throw new NotFoundException('Passenger not found after update');
    return updated;
  }

  async cancelJoin(rideId: string, userId: string): Promise<{ message: string }> {
    const passengers = await this.db
      .select()
      .from(carpoolPassengers)
      .where(
        and(
          eq(carpoolPassengers.rideId, rideId),
          eq(carpoolPassengers.userId, userId),
          or(eq(carpoolPassengers.status, 'requested'), eq(carpoolPassengers.status, 'confirmed')),
        ),
      );

    const [passenger] = passengers;
    if (!passenger) throw new NotFoundException('Join request not found');

    await this.db
      .update(carpoolPassengers)
      .set({ status: 'cancelled' })
      .where(eq(carpoolPassengers.id, passenger.id));

    if (passenger.status === 'confirmed') {
      const ride = await this.findRideInternal(rideId);
      const newSeatsTaken = Math.max(0, ride.seatsTaken - passenger.seats);
      const newStatus =
        ride.status === 'full' && newSeatsTaken < ride.seatsTotal ? 'open' : ride.status;

      await this.db
        .update(carpoolRides)
        .set({ seatsTaken: newSeatsTaken, status: newStatus })
        .where(eq(carpoolRides.id, rideId));
    }

    return { message: 'Join request cancelled' };
  }

  async cancelRide(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.findRideInternal(rideId);

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Only the ride driver can perform this action');
    }

    const [cancelled] = await this.db
      .update(carpoolRides)
      .set({ status: 'cancelled' })
      .where(eq(carpoolRides.id, rideId))
      .returning();

    await this.db
      .update(carpoolPassengers)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(carpoolPassengers.rideId, rideId),
          or(eq(carpoolPassengers.status, 'requested'), eq(carpoolPassengers.status, 'confirmed')),
        ),
      );

    if (!cancelled) throw new NotFoundException('Ride not found after update');
    return cancelled;
  }

  async myRides(userId: string): Promise<{ asDriver: Ride[]; asPassenger: Passenger[] }> {
    const [asDriver, asPassenger] = await Promise.all([
      this.db
        .select()
        .from(carpoolRides)
        .where(eq(carpoolRides.driverId, userId))
        .orderBy(sql`${carpoolRides.departureTime} DESC`),
      this.db
        .select()
        .from(carpoolPassengers)
        .where(eq(carpoolPassengers.userId, userId))
        .orderBy(sql`${carpoolPassengers.joinedAt} DESC`),
    ]);

    return { asDriver, asPassenger };
  }

  private async findRideInternal(id: string, db: PostgresJsDatabase = this.db): Promise<Ride> {
    const [row] = await db.select().from(carpoolRides).where(eq(carpoolRides.id, id));
    if (!row) throw new NotFoundException('Ride not found');
    return row;
  }

  private async findPassengerInternal(
    id: string,
    db: PostgresJsDatabase = this.db,
  ): Promise<Passenger> {
    const [row] = await db.select().from(carpoolPassengers).where(eq(carpoolPassengers.id, id));
    if (!row) throw new NotFoundException('Passenger not found');
    return row;
  }

  private buildWhereClause(filters: RideFiltersDto): SQL | undefined {
    const conditions: SQL[] = [];

    conditions.push(eq(carpoolRides.status, 'open'));
    conditions.push(gte(carpoolRides.departureTime, sql`NOW()`));

    if (filters.originLat != null && filters.originLng != null) {
      const point = makePoint(filters.originLng, filters.originLat);
      conditions.push(withinRadius(carpoolRides.origin, point, filters.radius));
    }

    if (filters.destinationLat != null && filters.destinationLng != null) {
      const point = makePoint(filters.destinationLng, filters.destinationLat);
      conditions.push(withinRadius(carpoolRides.destination, point, filters.radius));
    }

    if (filters.date) {
      const dayStart = new Date(`${filters.date}T00:00:00Z`);
      const dayEnd = new Date(`${filters.date}T23:59:59.999Z`);
      conditions.push(gte(carpoolRides.departureTime, dayStart));
      conditions.push(lt(carpoolRides.departureTime, dayEnd));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
