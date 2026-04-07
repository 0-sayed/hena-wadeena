import { RIDE, USER } from '../../../../../scripts/seed/shared-ids.js';

const PS01 = 'd4000000-0000-4000-8000-000000000001';
const PS02 = 'd4000000-0000-4000-8000-000000000002';
const PS03 = 'd4000000-0000-4000-8000-000000000003';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

/** Showcase: passengers for seeded carpool rides (must match seatsTaken counts) */
export const showcaseCarPoolPassengers = [
  // CR01 seatsTaken=1: TOURIST_SALMA confirmed
  {
    id: PS01,
    rideId: RIDE.CR01,
    userId: USER.TOURIST_SALMA,
    seats: 1,
    status: 'confirmed' as const,
    joinedAt: hoursAgo(20),
  },
  // CR03 seatsTaken=2: TOURIST_HASSAN + STUDENT_NOUR confirmed
  {
    id: PS02,
    rideId: RIDE.CR03,
    userId: USER.TOURIST_HASSAN,
    seats: 1,
    status: 'confirmed' as const,
    joinedAt: hoursAgo(25),
  },
  {
    id: PS03,
    rideId: RIDE.CR03,
    userId: USER.STUDENT_NOUR,
    seats: 1,
    status: 'confirmed' as const,
    joinedAt: hoursAgo(24),
  },
];
