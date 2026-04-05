// Redis Stream event names
// Payload types are defined by the emitting service

export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  LISTING_CREATED: 'listing.created',
  LISTING_VERIFIED: 'listing.verified',
  LISTING_INQUIRY_RECEIVED: 'listing_inquiry.received',
  LISTING_INQUIRY_REPLIED: 'listing_inquiry.replied',
  BOOKING_REQUESTED: 'booking.requested',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  REVIEW_SUBMITTED: 'review.submitted',
  OPPORTUNITY_PUBLISHED: 'opportunity.published',
  POI_APPROVED: 'poi.approved',
  KB_REBUILD_REQUESTED: 'kb.rebuild.requested',
  BUSINESS_VERIFIED: 'business.verified',
  COMMODITY_PRICE_UPDATED: 'commodity_price.updated',
  USER_SUSPENDED: 'user.suspended',
  USER_BANNED: 'user.banned',
  USER_DELETED: 'user.deleted',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_ACTIVATED: 'user.activated',
  USER_VERIFIED: 'user.verified',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// Booking event payloads intersect with Record<string, string> because they
// travel through Redis Streams, where all field values must be strings. The
// intersection gives them a string index signature so producers can publish
// them and consumers can narrow raw stream data into them without
// `as unknown as T` double-casts.
export type BookingEventPayload = Record<string, string> & {
  bookingId: string;
  packageId: string;
  guideProfileId: string;
  guideUserId: string;
  touristUserId: string;
  packageTitleAr: string;
  packageTitleEn: string;
  totalPrice: string;
};

export type BookingCancelledEventPayload = BookingEventPayload & {
  cancellationReason?: string;
  cancelledByRole: string;
  cancelledByUserId: string;
};
