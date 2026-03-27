import { generateId } from '@hena-wadeena/nest-common';
import { SQL, sql } from 'drizzle-orm';
import { geometry, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { businessStatusEnum, verificationStatusEnum } from '../enums';
import { marketSchema } from '../schema';

import { tsvector } from './types';

export const businessDirectories = marketSchema.table(
  'business_directories',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    ownerId: uuid('owner_id').notNull(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en'),
    category: text().notNull(),
    description: text(),
    descriptionAr: text('description_ar'),
    district: text(),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    phone: text(),
    website: text(),
    logoUrl: text('logo_url'),
    status: businessStatusEnum().default('active').notNull(),
    verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),
    verifiedBy: uuid('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('simple', market.normalize_arabic(coalesce(${businessDirectories.nameAr}, ''))), 'A') || setweight(to_tsvector('simple', coalesce(${businessDirectories.nameEn}, '')), 'A') || setweight(to_tsvector('simple', market.normalize_arabic(coalesce(${businessDirectories.descriptionAr}, ''))), 'B') || setweight(to_tsvector('simple', coalesce(${businessDirectories.description}, '')), 'B') || setweight(to_tsvector('simple', market.normalize_arabic(coalesce(${businessDirectories.district}, ''))), 'C') || setweight(to_tsvector('simple', market.normalize_arabic(coalesce(${businessDirectories.category}, ''))), 'C')`,
    ),
  },
  (t) => [
    index('idx_business_dir_owner_id').on(t.ownerId),
    index('idx_business_dir_category').on(t.category),
    index('idx_business_dir_location').using('gist', t.location),
    index('idx_biz_dir_verification_status').on(t.verificationStatus),
    index('idx_biz_dir_district').on(t.district),
    index('idx_biz_dir_search_vector').using('gin', t.searchVector),
    index('idx_biz_dir_name_ar_trgm').using('gin', sql`${t.nameAr} gin_trgm_ops`),
    index('idx_biz_dir_name_en_trgm').using('gin', sql`${t.nameEn} gin_trgm_ops`),
  ],
);
