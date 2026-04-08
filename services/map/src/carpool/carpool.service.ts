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
import { isUniqueViolation } from '../utils/db';
import { distanceTo, makePoint, withinRadius } from '../utils/postgis';

import type { CreateRideDto, JoinRideDto, RideFiltersDto } from './dto';

type Ride = typeof carpoolRides.$inferSelect;
type Passenger = typeof carpoolPassengers.$inferSelect;

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
        departureTime: new Date(dto.departureTime),
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

      if (passenger.rideId !== rideId) {
        throw new BadRequestException('Passenger does not belong to this ride');
      }

      if (ride.driverId !== driverId) {
        throw new ForbiddenException('Only the ride driver can perform this action');
      }

      const [updatedPassenger] = await tx
        .update(carpoolPassengers)
        .set({ status: 'confirmed' })
        .where(
          and(eq(carpoolPassengers.id, passengerId), eq(carpoolPassengers.status, 'requested')),
        )
        .returning();

      if (!updatedPassenger) {
        throw new ConflictException('Passenger could not be confirmed. Status may have changed.');
      }

      const [updatedRide] = await tx
        .update(carpoolRides)
        .set({
          seatsTaken: sql`${carpoolRides.seatsTaken} + ${passenger.seats}`,
          status: sql`CASE WHEN ${carpoolRides.seatsTaken} + ${passenger.seats} >= ${carpoolRides.seatsTotal} THEN 'full' ELSE ${carpoolRides.status} END`,
        })
        .where(
          and(
            eq(carpoolRides.id, rideId),
            sql`${carpoolRides.seatsTaken} + ${passenger.seats} <= ${carpoolRides.seatsTotal}`,
          ),
        )
        .returning();

      if (!updatedRide) {
        throw new BadRequestException('Not enough available seats');
      }

      return updatedPassenger;
    });
  }

  async declinePassenger(
    rideId: string,
    passengerId: string,
    driverId: string,
  ): Promise<Passenger> {
    return this.db.transaction(async (tx) => {
      const passenger = await this.findPassengerInternal(passengerId, tx);
      const ride = await this.findRideInternal(rideId, tx);

      if (passenger.rideId !== rideId) {
        throw new BadRequestException('Passenger does not belong to this ride');
      }

      if (ride.driverId !== driverId) {
        throw new ForbiddenException('Only the ride driver can perform this action');
      }

      const [updated] = await tx
        .update(carpoolPassengers)
        .set({ status: 'declined' })
        .where(
          and(eq(carpoolPassengers.id, passengerId), eq(carpoolPassengers.status, 'requested')),
        )
        .returning();

      if (!updated) {
        throw new ConflictException(
          'Passenger could not be declined. They may have already been confirmed, declined, or cancelled.',
        );
      }
      return updated;
    });
  }

  async cancelJoin(rideId: string, userId: string): Promise<{ message: string }> {
    return this.db.transaction(async (tx) => {
      const [passenger] = await tx
        .select()
        .from(carpoolPassengers)
        .where(
          and(
            eq(carpoolPassengers.rideId, rideId),
            eq(carpoolPassengers.userId, userId),
            or(
              eq(carpoolPassengers.status, 'requested'),
              eq(carpoolPassengers.status, 'confirmed'),
            ),
          ),
        );

      if (!passenger) throw new NotFoundException('Join request not found');

      const [cancelled] = await tx
        .update(carpoolPassengers)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(carpoolPassengers.id, passenger.id),
            or(
              eq(carpoolPassengers.status, 'requested'),
              eq(carpoolPassengers.status, 'confirmed'),
            ),
          ),
        )
        .returning();

      if (!cancelled) {
        throw new ConflictException(
          'Join request could not be cancelled. Status may have changed.',
        );
      }

      if (passenger.status === 'confirmed') {
        await tx
          .update(carpoolRides)
          .set({
            seatsTaken: sql`GREATEST(0, ${carpoolRides.seatsTaken} - ${passenger.seats})`,
            status: sql`CASE WHEN ${carpoolRides.status} = 'full' AND ${carpoolRides.seatsTaken} - ${passenger.seats} < ${carpoolRides.seatsTotal} THEN 'open' ELSE ${carpoolRides.status} END`,
          })
          .where(eq(carpoolRides.id, rideId));
      }

      return { message: 'Join request cancelled' };
    });
  }

  async cancelRide(rideId: string, driverId: string): Promise<Ride> {
    return this.db.transaction(async (tx) => {
      const ride = await this.findRideInternal(rideId, tx);

      if (ride.driverId !== driverId) {
        throw new ForbiddenException('Only the ride driver can perform this action');
      }

      const [cancelled] = await tx
        .update(carpoolRides)
        .set({ status: 'cancelled' })
        .where(eq(carpoolRides.id, rideId))
        .returning();

      await tx
        .update(carpoolPassengers)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(carpoolPassengers.rideId, rideId),
            or(
              eq(carpoolPassengers.status, 'requested'),
              eq(carpoolPassengers.status, 'confirmed'),
            ),
          ),
        );

      if (!cancelled) throw new NotFoundException('Ride not found after update');
      return cancelled;
    });
  }

  async activateRide(rideId: string, driverId: string): Promise<Ride> {
    return this.db.transaction(async (tx) => {
      const ride = await this.findRideInternal(rideId, tx);

      if (ride.driverId !== driverId) {
        throw new ForbiddenException('Only the ride driver can perform this action');
      }

      if (ride.status !== 'cancelled') {
        throw new ConflictException('Only cancelled rides can be reactivated');
      }

      if (ride.departureTime <= new Date()) {
        throw new BadRequestException('Past rides cannot be reactivated');
      }

      await tx
        .delete(carpoolPassengers)
        .where(
          and(eq(carpoolPassengers.rideId, rideId), eq(carpoolPassengers.status, 'cancelled')),
        );

      const [reactivated] = await tx
        .update(carpoolRides)
        .set({
          status: 'open',
          seatsTaken: 0,
        })
        .where(eq(carpoolRides.id, rideId))
        .returning();

      if (!reactivated) throw new NotFoundException('Ride not found after update');
      return reactivated;
    });
  }

  async deleteRide(rideId: string, driverId: string): Promise<{ deleted: true; id: string }> {
    return this.db.transaction(async (tx) => {
      const ride = await this.findRideInternal(rideId, tx);

      if (ride.driverId !== driverId) {
        throw new ForbiddenException('Only the ride driver can perform this action');
      }

      if (!['cancelled', 'completed'].includes(ride.status)) {
        throw new ConflictException('Only cancelled or completed rides can be deleted');
      }

      await tx.delete(carpoolPassengers).where(eq(carpoolPassengers.rideId, rideId));

      const [deletedRide] = await tx
        .delete(carpoolRides)
        .where(eq(carpoolRides.id, rideId))
        .returning({ id: carpoolRides.id });

      if (!deletedRide) throw new NotFoundException('Ride not found after delete');
      return { deleted: true, id: deletedRide.id };
    });
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
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      conditions.push(gte(carpoolRides.departureTime, dayStart));
      conditions.push(lt(carpoolRides.departureTime, dayEnd));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
