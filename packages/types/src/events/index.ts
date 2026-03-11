// Redis Stream event names
// Payload types are defined by the emitting service

export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  LISTING_CREATED: 'listing.created',
  LISTING_VERIFIED: 'listing.verified',
  BOOKING_REQUESTED: 'booking.requested',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  REVIEW_SUBMITTED: 'review.submitted',
  OPPORTUNITY_PUBLISHED: 'opportunity.published',
  POI_APPROVED: 'poi.approved',
  KB_REBUILD_REQUESTED: 'kb.rebuild.requested',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
