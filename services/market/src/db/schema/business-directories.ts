import { generateId } from '@hena-wadeena/nest-common';
import { geometry, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { businessStatusEnum, verificationStatusEnum } from '../enums';
import { marketSchema } from '../schema';

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
  },
  (t) => [
    index('idx_business_dir_owner_id').on(t.ownerId),
    index('idx_business_dir_category').on(t.category),
    index('idx_business_dir_location').using('gist', t.location),
    index('idx_biz_dir_verification_status').on(t.verificationStatus),
    index('idx_biz_dir_district').on(t.district),
  ],
);
