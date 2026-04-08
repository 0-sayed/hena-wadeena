import { relations } from 'drizzle-orm';

export { mapSchema } from '../schema';

export * from '../enums';
export { pointsOfInterest } from './points-of-interest';
export { carpoolRides } from './carpool-rides';
export { carpoolPassengers } from './carpool-passengers';
export { siteStatusUpdates } from './site-status-updates';
export { siteStewards } from './site-stewards';

// Re-import for relation definitions
import { carpoolPassengers } from './carpool-passengers';
import { carpoolRides } from './carpool-rides';
import { pointsOfInterest } from './points-of-interest';
import { siteStatusUpdates } from './site-status-updates';
import { siteStewards } from './site-stewards';

// --- Relations ---

export const carpoolRidesRelations = relations(carpoolRides, ({ many }) => ({
  passengers: many(carpoolPassengers),
}));

export const carpoolPassengersRelations = relations(carpoolPassengers, ({ one }) => ({
  ride: one(carpoolRides, {
    fields: [carpoolPassengers.rideId],
    references: [carpoolRides.id],
  }),
}));

export const siteStatusUpdatesRelations = relations(siteStatusUpdates, ({ one }) => ({
  poi: one(pointsOfInterest, {
    fields: [siteStatusUpdates.poiId],
    references: [pointsOfInterest.id],
  }),
}));

export const siteStewardsRelations = relations(siteStewards, ({ one }) => ({
  poi: one(pointsOfInterest, {
    fields: [siteStewards.poiId],
    references: [pointsOfInterest.id],
  }),
}));
