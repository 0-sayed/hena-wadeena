import { relations } from 'drizzle-orm';

export { guideBookingSchema } from '../schema';

export * from '../enums';
export { guideAvailability } from './guide-availability';
export { bookings } from './bookings';
export { guides } from './guides';
export { guideReviews } from './reviews';
export { tourPackages } from './tour-packages';

// Re-import for relation definitions
import { bookings } from './bookings';
import { guideAvailability } from './guide-availability';
import { guides } from './guides';
import { guideReviews } from './reviews';
import { tourPackages } from './tour-packages';

// --- Relations ---

export const guidesRelations = relations(guides, ({ many }) => ({
  tourPackages: many(tourPackages),
  bookings: many(bookings),
  availability: many(guideAvailability),
  reviews: many(guideReviews),
}));

export const tourPackagesRelations = relations(tourPackages, ({ one, many }) => ({
  guide: one(guides, {
    fields: [tourPackages.guideId],
    references: [guides.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  package: one(tourPackages, {
    fields: [bookings.packageId],
    references: [tourPackages.id],
  }),
  guide: one(guides, {
    fields: [bookings.guideId],
    references: [guides.id],
  }),
  review: one(guideReviews, {
    fields: [bookings.id],
    references: [guideReviews.bookingId],
  }),
}));

export const guideAvailabilityRelations = relations(guideAvailability, ({ one }) => ({
  guide: one(guides, {
    fields: [guideAvailability.guideId],
    references: [guides.id],
  }),
}));

export const guideReviewsRelations = relations(guideReviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [guideReviews.bookingId],
    references: [bookings.id],
  }),
  guide: one(guides, {
    fields: [guideReviews.guideId],
    references: [guides.id],
  }),
}));
