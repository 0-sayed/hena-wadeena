import { guideBookingSchema } from './schema';

export const bookingStatusEnum = guideBookingSchema.enum('booking_status', [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const packageStatusEnum = guideBookingSchema.enum('package_status', ['active', 'inactive']);

export const attractionTypeEnum = guideBookingSchema.enum('attraction_type', [
  'attraction',
  'historical',
  'natural',
  'festival',
  'adventure',
]);

export const attractionAreaEnum = guideBookingSchema.enum('attraction_area', [
  'kharga',
  'dakhla',
  'farafra',
  'baris',
  'balat',
]);

export const bestSeasonEnum = guideBookingSchema.enum('best_season', [
  'winter',
  'summer',
  'spring',
  'all_year',
]);

export const bestTimeOfDayEnum = guideBookingSchema.enum('best_time_of_day', [
  'morning',
  'evening',
  'any',
]);

export const difficultyEnum = guideBookingSchema.enum('difficulty', ['easy', 'moderate', 'hard']);
