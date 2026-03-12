import { relations } from 'drizzle-orm';

export { marketSchema } from '../schema';

export * from '../enums';
export { listings } from './listings';
export { priceSnapshots } from './price-snapshots';
export { businessDirectories } from './business-directories';
export { reviews } from './reviews';
export { investmentOpportunities } from './investment-opportunities';
export { investmentApplications } from './investment-applications';

// Re-import for relation definitions
import { investmentApplications } from './investment-applications';
import { investmentOpportunities } from './investment-opportunities';
import { listings } from './listings';
import { reviews } from './reviews';

// --- Relations ---

export const listingsRelations = relations(listings, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  listing: one(listings, {
    fields: [reviews.listingId],
    references: [listings.id],
  }),
}));

export const opportunitiesRelations = relations(investmentOpportunities, ({ many }) => ({
  applications: many(investmentApplications),
}));

export const applicationsRelations = relations(investmentApplications, ({ one }) => ({
  opportunity: one(investmentOpportunities, {
    fields: [investmentApplications.opportunityId],
    references: [investmentOpportunities.id],
  }),
}));
