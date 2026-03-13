import { guideBookingSchema } from './schema';

export const bookingStatusEnum = guideBookingSchema.enum('booking_status', [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const packageStatusEnum = guideBookingSchema.enum('package_status', ['active', 'inactive']);
