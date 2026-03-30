import { RIDE, USER } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedCarpoolRide {
  id: string;
  driverId: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  originName: string;
  destinationName: string;
  departureTime: Date;
  seatsTotal: number;
  seatsTaken: number;
  pricePerSeat: number; // piasters
  notes?: string;
  status: 'open';
}

// Keep showcase rides always in the future relative to seed run time
// to avoid stale "open" rides after initial deployment dates pass.
const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

/** Showcase layer only: 5 inter-city carpool rides */
export const carpoolRides: SeedCarpoolRide[] = [
  {
    id: RIDE.CR01,
    driverId: USER.DRIVER_AMRO,
    originLat: 25.4363,
    originLon: 30.555,
    destLat: 25.4946,
    destLon: 28.9781,
    originName: 'الخارجة — موقف السيارات الرئيسي',
    destinationName: 'الداخلة — موقف موط',
    departureTime: hoursFromNow(24),
    seatsTotal: 4,
    seatsTaken: 1,
    pricePerSeat: 15000,
    notes: 'سيارة مكيفة، الانطلاق في الموعد بالضبط',
    status: 'open',
  },
  {
    id: RIDE.CR02,
    driverId: USER.DRIVER_AMRO,
    originLat: 25.4946,
    originLon: 28.9781,
    destLat: 27.0567,
    destLon: 27.9703,
    originName: 'الداخلة — موقف موط',
    destinationName: 'الفرافرة — وسط المدينة',
    departureTime: hoursFromNow(48),
    seatsTotal: 3,
    seatsTaken: 0,
    pricePerSeat: 20000,
    notes: 'رحلة طويلة، يرجى الالتزام بالموعد',
    status: 'open',
  },
  {
    id: RIDE.CR03,
    driverId: USER.RESIDENT_MOHAMED,
    originLat: 25.4363,
    originLon: 30.555,
    destLat: 24.6544,
    destLon: 30.5956,
    originName: 'الخارجة — وسط المدينة',
    destinationName: 'باريس — الميدان الرئيسي',
    departureTime: hoursFromNow(30),
    seatsTotal: 3,
    seatsTaken: 2,
    pricePerSeat: 10000,
    status: 'open',
  },
  {
    id: RIDE.CR04,
    driverId: USER.RESIDENT_MOHAMED,
    originLat: 25.5667,
    originLon: 29.2667,
    destLat: 25.4946,
    destLon: 28.9781,
    originName: 'بلاط — مدخل المدينة',
    destinationName: 'الداخلة — موقف موط',
    departureTime: hoursFromNow(72),
    seatsTotal: 4,
    seatsTaken: 0,
    pricePerSeat: 5000,
    status: 'open',
  },
  {
    id: RIDE.CR05,
    driverId: USER.DRIVER_AMRO,
    originLat: 27.0567,
    originLon: 27.9703,
    destLat: 25.4363,
    destLon: 30.555,
    originName: 'الفرافرة — وسط المدينة',
    destinationName: 'الخارجة — موقف السيارات الرئيسي',
    departureTime: hoursFromNow(120),
    seatsTotal: 4,
    seatsTaken: 0,
    pricePerSeat: 25000,
    notes: 'رحلة العودة من الفرافرة',
    status: 'open',
  },
];
