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
  'agricultural_produce',
]);
export const listingStatusEnum = marketSchema.enum('listing_status', [
  'draft',
  'active',
  'sold',
  'rented',
  'suspended',
]);
export const listingInquiryStatusEnum = marketSchema.enum('listing_inquiry_status', [
  'pending',
  'read',
  'replied',
]);
export const businessInquiryStatusEnum = marketSchema.enum('business_inquiry_status', [
  'pending',
  'read',
  'replied',
]);

// Employment board
export const jobCategoryEnum = marketSchema.enum('job_category', [
  'agriculture',
  'tourism',
  'skilled_trade',
  'domestic',
  'logistics',
  'handicraft',
]);
export const jobStatusEnum = marketSchema.enum('job_status', [
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
]);
export const jobApplicationStatusEnum = marketSchema.enum('job_application_status', [
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'in_progress',
  'completed',
]);
export const compensationTypeEnum = marketSchema.enum('compensation_type', [
  'fixed',
  'daily',
  'per_kg',
  'negotiable',
]);
export const reviewDirectionEnum = marketSchema.enum('review_direction', [
  'worker_rates_poster',
  'poster_rates_worker',
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

// Commodity prices
export const commodityCategoryEnum = marketSchema.enum('commodity_category', [
  'fruits',
  'grains',
  'vegetables',
  'oils',
  'livestock',
  'other',
]);
export const commodityUnitEnum = marketSchema.enum('commodity_unit', [
  'kg',
  'ton',
  'ardeb',
  'kantar',
  'liter',
  'piece',
  'box',
]);
export const priceTypeEnum = marketSchema.enum('price_type', ['wholesale', 'retail', 'farm_gate']);
export const verificationStatusEnum = marketSchema.enum('verification_status', [
  'pending',
  'verified',
  'rejected',
  'suspended',
]);

// Well logs
export const wellAreaEnum = marketSchema.enum('well_area', [
  'kharga',
  'dakhla',
  'farafra',
  'baris',
  'balat',
]);

// Price alerts
export const alertDirectionEnum = marketSchema.enum('alert_direction', ['above', 'below']);

// News
export const newsCategoryEnum = marketSchema.enum('news_category', [
  'announcement',
  'tourism',
  'investment',
  'agriculture',
  'infrastructure',
  'culture',
  'events',
]);
