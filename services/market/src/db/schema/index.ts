import { relations } from 'drizzle-orm';

export { marketSchema } from '../schema';
export { tsvector } from './types';

export * from '../enums';
export { businessInquiries } from './business-inquiries';
export { listingInquiries } from './listing-inquiries';
export { listings } from './listings';
export { jobApplications } from './job-applications';
export { jobPosts } from './job-posts';
export { jobReviews } from './job-reviews';
export { priceSnapshots } from './price-snapshots';
export { businessDirectories } from './business-directories';
export { reviews } from './reviews';
export { reviewHelpfulVotes } from './review-helpful-votes';
export { investmentOpportunities } from './investment-opportunities';
export { investmentApplications } from './investment-applications';
export { commodities } from './commodities';
export { commodityPrices } from './commodity-prices';
export { businessCommodities } from './business-commodities';
export { benefitInfo } from './benefit-info';
export { produceListingDetails } from './produce-listing-details';
export { priceAlertSubscriptions } from './price-alert-subscriptions';
export { wellLogs } from './well-logs';

// Re-import for relation definitions
import { businessCommodities } from './business-commodities';
import { businessDirectories } from './business-directories';
import { businessInquiries } from './business-inquiries';
import { commodities } from './commodities';
import { commodityPrices } from './commodity-prices';
import { investmentApplications } from './investment-applications';
import { investmentOpportunities } from './investment-opportunities';
import { jobApplications } from './job-applications';
import { jobPosts } from './job-posts';
import { jobReviews } from './job-reviews';
import { listingInquiries } from './listing-inquiries';
import { listings } from './listings';
import { priceAlertSubscriptions } from './price-alert-subscriptions';
import { produceListingDetails } from './produce-listing-details';
import { reviewHelpfulVotes } from './review-helpful-votes';
import { reviews } from './reviews';

// --- Relations ---

export const listingsRelations = relations(listings, ({ many, one }) => ({
  reviews: many(reviews),
  inquiries: many(listingInquiries),
  produceDetails: one(produceListingDetails, {
    fields: [listings.id],
    references: [produceListingDetails.listingId],
  }),
}));

export const jobPostsRelations = relations(jobPosts, ({ many }) => ({
  applications: many(jobApplications),
  reviews: many(jobReviews),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one, many }) => ({
  job: one(jobPosts, {
    fields: [jobApplications.jobId],
    references: [jobPosts.id],
  }),
  reviews: many(jobReviews),
}));

export const jobReviewsRelations = relations(jobReviews, ({ one }) => ({
  job: one(jobPosts, {
    fields: [jobReviews.jobId],
    references: [jobPosts.id],
  }),
  application: one(jobApplications, {
    fields: [jobReviews.applicationId],
    references: [jobApplications.id],
  }),
}));

export const produceListingDetailsRelations = relations(produceListingDetails, ({ one }) => ({
  listing: one(listings, {
    fields: [produceListingDetails.listingId],
    references: [listings.id],
  }),
}));

export const listingInquiriesRelations = relations(listingInquiries, ({ one }) => ({
  listing: one(listings, {
    fields: [listingInquiries.listingId],
    references: [listings.id],
  }),
}));

export const businessInquiriesRelations = relations(businessInquiries, ({ one }) => ({
  business: one(businessDirectories, {
    fields: [businessInquiries.businessId],
    references: [businessDirectories.id],
  }),
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
  priceAlertSubscriptions: many(priceAlertSubscriptions),
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
  inquiries: many(businessInquiries),
}));

export const priceAlertSubscriptionsRelations = relations(priceAlertSubscriptions, ({ one }) => ({
  commodity: one(commodities, {
    fields: [priceAlertSubscriptions.commodityId],
    references: [commodities.id],
  }),
}));
