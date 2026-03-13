import { generateId } from '@hena-wadeena/nest-common';
import { boolean, date, index, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { guideBookingSchema } from '../schema';

import { guides } from './guides';

export const guideAvailability = guideBookingSchema.table(
  'guide_availability',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guides.id),
    date: date().notNull(),
    isBlocked: boolean('is_blocked').default(true).notNull(),
    note: text(),
  },
  (t) => [
    uniqueIndex('uq_guide_availability_guide_date').on(t.guideId, t.date),
    index('idx_guide_availability_guide_id').on(t.guideId),
    index('idx_guide_availability_date').on(t.date),
  ],
);
