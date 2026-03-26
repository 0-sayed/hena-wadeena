import { relations } from 'drizzle-orm';

export { marketSchema } from '../schema';

export * from '../enums';
export { listings } from './listings';
export { priceSnapshots } from './price-snapshots';
export { businessDirectories } from './business-directories';
export { reviews } from './reviews';
export { reviewHelpfulVotes } from './review-helpful-votes';
export { investmentOpportunities } from './investment-opportunities';
export { investmentApplications } from './investment-applications';
export { commodities } from './commodities';
export { commodityPrices } from './commodity-prices';
export { businessCommodities } from './business-commodities';

// Re-import for relation definitions
import { businessCommodities } from './business-commodities';
import { businessDirectories } from './business-directories';
import { commodities } from './commodities';
import { commodityPrices } from './commodity-prices';
import { investmentApplications } from './investment-applications';
import { investmentOpportunities } from './investment-opportunities';
import { listings } from './listings';
import { reviewHelpfulVotes } from './review-helpful-votes';
import { reviews } from './reviews';

// --- Relations ---

export const listingsRelations = relations(listings, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  listing: one(listings, {
    fields: [reviews.listingId],
    references: [listings.id],
  }),
  helpfulVotes: many(reviewHelpfulVotes),
}));

export const reviewHelpfulVotesRelations = relations(reviewHelpfulVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewHelpfulVotes.reviewId],
    references: [reviews.id],
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

export const commoditiesRelations = relations(commodities, ({ many }) => ({
  prices: many(commodityPrices),
  businessCommodities: many(businessCommodities),
}));

export const commodityPricesRelations = relations(commodityPrices, ({ one }) => ({
  commodity: one(commodities, {
    fields: [commodityPrices.commodityId],
    references: [commodities.id],
  }),
}));

export const businessCommoditiesRelations = relations(businessCommodities, ({ one }) => ({
  commodity: one(commodities, {
    fields: [businessCommodities.commodityId],
    references: [commodities.id],
  }),
  business: one(businessDirectories, {
    fields: [businessCommodities.businessId],
    references: [businessDirectories.id],
  }),
}));

export const businessDirectoriesRelations = relations(businessDirectories, ({ many }) => ({
  businessCommodities: many(businessCommodities),
}));
