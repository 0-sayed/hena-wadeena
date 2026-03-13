import { relations } from 'drizzle-orm';

export { mapSchema } from '../schema';

export * from '../enums';
export { pointsOfInterest } from './points-of-interest';
export { carpoolRides } from './carpool-rides';
export { carpoolPassengers } from './carpool-passengers';

// Re-import for relation definitions
import { carpoolPassengers } from './carpool-passengers';
import { carpoolRides } from './carpool-rides';

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
