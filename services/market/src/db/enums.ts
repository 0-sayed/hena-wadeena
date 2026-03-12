import { marketSchema } from './schema';

// Listing enums
export const listingTypeEnum = marketSchema.enum('listing_type', [
  'real_estate',
  'land',
  'business',
]);
export const transactionTypeEnum = marketSchema.enum('transaction_type', ['sale', 'rent']);
export const listingCategoryEnum = marketSchema.enum('listing_category', [
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
export const listingStatusEnum = marketSchema.enum('listing_status', [
  'draft',
  'active',
  'sold',
  'rented',
  'suspended',
]);

// Investment enums
export const investmentSectorEnum = marketSchema.enum('investment_sector', [
  'agriculture',
  'tourism',
  'industry',
  'real_estate',
  'services',
  'technology',
  'energy',
]);
export const opportunityStatusEnum = marketSchema.enum('opportunity_status', [
  'draft',
  'review',
  'active',
  'closed',
  'taken',
]);
export const applicationStatusEnum = marketSchema.enum('application_status', [
  'pending',
  'reviewed',
  'accepted',
  'rejected',
  'withdrawn',
]);

// Business directory
export const businessStatusEnum = marketSchema.enum('business_status', ['active', 'inactive']);
