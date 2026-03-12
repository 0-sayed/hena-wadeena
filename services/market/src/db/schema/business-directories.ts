import { generateId } from '@hena-wadeena/nest-common';
import { geometry, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { businessStatusEnum } from '../enums';
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
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    phone: text(),
    website: text(),
    logoUrl: text('logo_url'),
    status: businessStatusEnum().default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_business_dir_owner_id').on(t.ownerId),
    index('idx_business_dir_category').on(t.category),
    index('idx_business_dir_location').using('gist', t.location),
  ],
);
