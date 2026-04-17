import { mapSchema } from './schema';

export const poiCategoryEnum = mapSchema.enum('poi_category', [
  'historical',
  'natural',
  'religious',
  'recreational',
  'accommodation',
  'restaurant',
  'service',
  'government',
  'solar_installation',
]);

export const poiStatusEnum = mapSchema.enum('poi_status', ['pending', 'approved', 'rejected']);

export const carpoolRideStatusEnum = mapSchema.enum('carpool_ride_status', [
  'open',
  'full',
  'departed',
  'completed',
  'cancelled',
]);

export const passengerStatusEnum = mapSchema.enum('passenger_status', [
  'requested',
  'confirmed',
  'declined',
  'cancelled',
]);

export const siteStatusEnum = mapSchema.enum('site_status', [
  'open',
  'closed',
  'closed_temporarily',
  'limited_access',
  'under_restoration',
]);
