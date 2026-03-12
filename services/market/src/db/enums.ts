import { pgEnum } from 'drizzle-orm/pg-core';

// Listing enums
export const listingTypeEnum = pgEnum('listing_type', ['real_estate', 'land', 'business']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'rent']);
export const listingCategoryEnum = pgEnum('listing_category', [
  'place',
  'accommodation',
  'restaurant',
  'service',
  'activity',
  'transport',
  'education',
  'healthcare',
  'shopping',
]);
export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'active',
  'sold',
  'rented',
  'suspended',
]);

// Investment enums
export const investmentSectorEnum = pgEnum('investment_sector', [
  'agriculture',
  'tourism',
  'industry',
  'real_estate',
  'services',
  'technology',
  'energy',
]);
export const opportunityStatusEnum = pgEnum('opportunity_status', [
  'draft',
  'review',
  'active',
  'closed',
  'taken',
]);
export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'reviewed',
  'accepted',
  'rejected',
  'withdrawn',
]);

// Business directory
export const businessStatusEnum = pgEnum('business_status', ['active', 'inactive']);
