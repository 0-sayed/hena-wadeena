import { generateId } from '@hena-wadeena/nest-common';
import { text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { marketSchema } from '../schema';

export const benefitInfo = marketSchema.table(
  'benefit_info',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    slug: text().notNull(),
    nameAr: text('name_ar').notNull(),
    nameEn: text('name_en').notNull(),
    ministryAr: text('ministry_ar').notNull(),
    documentsAr: text('documents_ar').array().notNull(),
    officeNameAr: text('office_name_ar').notNull(),
    officePhone: text('office_phone').notNull(),
    officeAddressAr: text('office_address_ar').notNull(),
    enrollmentNotesAr: text('enrollment_notes_ar').notNull(),
    enrollmentNotesEn: text('enrollment_notes_en'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('benefit_info_slug_idx').on(t.slug)],
);
