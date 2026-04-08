import { relations } from 'drizzle-orm';

export { guideBookingSchema } from '../schema';

export * from '../enums';
export { attractions } from './attractions';
export { guideAvailability } from './guide-availability';
export { bookings } from './bookings';
export { guides } from './guides';
export { guideReviews } from './reviews';
export { guideReviewHelpfulVotes } from './guide-review-helpful-votes';
export { tourPackages } from './tour-packages';
export { tourPackageAttractions } from './tour-package-attractions';
export { desertTrips } from './desert-trips';

// Re-import for relation definitions
import { attractions } from './attractions';
import { bookings } from './bookings';
import { desertTrips } from './desert-trips';
import { guideAvailability } from './guide-availability';
import { guides } from './guides';
import { guideReviews } from './reviews';
import { tourPackageAttractions } from './tour-package-attractions';
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
  packageAttractions: many(tourPackageAttractions),
}));

export const attractionsRelations = relations(attractions, ({ many }) => ({
  packageAttractions: many(tourPackageAttractions),
}));

export const tourPackageAttractionsRelations = relations(tourPackageAttractions, ({ one }) => ({
  package: one(tourPackages, {
    fields: [tourPackageAttractions.packageId],
    references: [tourPackages.id],
  }),
  attraction: one(attractions, {
    fields: [tourPackageAttractions.attractionId],
    references: [attractions.id],
  }),
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
  review: one(guideReviews),
  desertTrip: one(desertTrips),
}));

export const desertTripsRelations = relations(desertTrips, ({ one }) => ({
  booking: one(bookings, {
    fields: [desertTrips.bookingId],
    references: [bookings.id],
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
