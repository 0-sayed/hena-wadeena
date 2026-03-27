import { generateId } from '@hena-wadeena/nest-common';
import { SQL, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  geometry,
  index,
  integer,
  jsonb,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  listingTypeEnum,
  transactionTypeEnum,
  listingCategoryEnum,
  listingStatusEnum,
} from '../enums';
import { marketSchema } from '../schema';

import { tsvector } from './types';

export const listings = marketSchema.table(
  'listings',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    ownerId: uuid('owner_id').notNull(),
    listingType: listingTypeEnum('listing_type').notNull(),
    transaction: transactionTypeEnum('transaction').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en'),
    description: text(),
    category: listingCategoryEnum().notNull(),
    subCategory: text('sub_category'),
    price: integer().notNull(),
    priceUnit: text('price_unit').default('EGP'),
    priceRange: text('price_range'),
    areaSqm: real('area_sqm'),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    address: text(),
    district: text(),
    images: text().array(),
    features: jsonb(),
    amenities: text().array(),
    tags: text().array(),
    contact: jsonb(),
    openingHours: text('opening_hours'),
    slug: text().notNull(),
    status: listingStatusEnum().default('draft').notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    featuredUntil: timestamp('featured_until', { withTimezone: true }),
    isPublished: boolean('is_published').default(false).notNull(),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    ratingAvg: real('rating_avg').default(0),
    reviewCount: integer('review_count').default(0),
    viewsCount: integer('views_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('simple', market.normalize_arabic(coalesce(${listings.titleAr}, ''))), 'A') || setweight(to_tsvector('simple', coalesce(${listings.titleEn}, '')), 'A') || setweight(to_tsvector('simple', market.normalize_arabic(coalesce(${listings.description}, ''))), 'B') || setweight(to_tsvector('simple', coalesce(${listings.address}, '')), 'C') || setweight(to_tsvector('simple', coalesce(${listings.district}, '')), 'C') || setweight(to_tsvector('simple', coalesce(${listings.subCategory}, '')), 'C')`,
    ),
  },
  (t) => [
    uniqueIndex('listings_slug_active_unique')
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_listings_status').on(t.status),
    index('idx_listings_category').on(t.category),
    index('idx_listings_district').on(t.district),
    index('idx_listings_owner_id').on(t.ownerId),
    index('idx_listings_created_at').on(t.createdAt.desc()),
    index('idx_listings_location').using('gist', t.location),
    index('idx_listings_tags').using('gin', t.tags),
    check('chk_listings_price_non_neg', sql`${t.price} >= 0`),
    index('idx_listings_search_vector').using('gin', t.searchVector),
    index('idx_listings_title_ar_trgm').using('gin', sql`${t.titleAr} gin_trgm_ops`),
    index('idx_listings_title_en_trgm').using('gin', sql`${t.titleEn} gin_trgm_ops`),
  ],
);
