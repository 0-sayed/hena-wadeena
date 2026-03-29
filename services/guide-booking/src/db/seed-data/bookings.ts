import { BOOKING, GUIDE_PROFILE, PACKAGE, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedBooking {
  id: string;
  packageId: string;
  guideId: string;
  touristId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  peopleCount: number;
  totalPrice: number; // piasters
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

/** Showcase layer only: 5 bookings in various states */
export const showcaseBookings: SeedBooking[] = [
  {
    id: BOOKING.BK01,
    packageId: PACKAGE.PK01,
    guideId: GUIDE_PROFILE.GP01,
    touristId: USER.TOURIST_SALMA,
    bookingDate: '2026-03-10',
    startTime: '08:00:00',
    peopleCount: 2,
    totalPrice: 400000, // 2 × 2000 EGP
    status: 'completed',
    notes: 'رحلة رائعة، شكراً يوسف',
  },
  {
    id: BOOKING.BK02,
    packageId: PACKAGE.PK03,
    guideId: GUIDE_PROFILE.GP02,
    touristId: USER.TOURIST_HASSAN,
    bookingDate: '2026-03-15',
    startTime: '07:00:00',
    peopleCount: 3,
    totalPrice: 1500000, // 3 × 5000 EGP
    status: 'completed',
  },
  {
    id: BOOKING.BK03,
    packageId: PACKAGE.PK05,
    guideId: GUIDE_PROFILE.GP03,
    touristId: USER.TOURIST_LAYLA,
    bookingDate: '2026-04-01',
    startTime: '09:00:00',
    peopleCount: 2,
    totalPrice: 500000, // 2 × 2500 EGP
    status: 'confirmed',
    notes: 'أول مرة أتزلج على الرمال',
  },
  {
    id: BOOKING.BK04,
    packageId: PACKAGE.PK07,
    guideId: GUIDE_PROFILE.GP04,
    touristId: USER.TOURIST_KARIM,
    bookingDate: '2026-04-05',
    startTime: '10:00:00',
    peopleCount: 1,
    totalPrice: 180000, // 1 × 1800 EGP
    status: 'pending',
  },
  {
    id: BOOKING.BK05,
    packageId: PACKAGE.PK09,
    guideId: GUIDE_PROFILE.GP05,
    touristId: USER.TOURIST_SALMA,
    bookingDate: '2026-03-20',
    startTime: '16:00:00',
    peopleCount: 1,
    totalPrice: 280000, // 1 × 2800 EGP
    status: 'completed',
  },
];
