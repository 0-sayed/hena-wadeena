import { generateId } from '@hena-wadeena/nest-common';
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { businessInquiryStatusEnum } from '../enums';
import { marketSchema } from '../schema';

import { businessDirectories } from './business-directories';

export const businessInquiries = marketSchema.table(
  'business_inquiries',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessDirectories.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull(),
    receiverId: uuid('receiver_id').notNull(),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    message: text().notNull(),
    replyMessage: text('reply_message'),
    status: businessInquiryStatusEnum('status').default('pending').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_business_inquiries_business_id').on(t.businessId),
    index('idx_business_inquiries_sender_id').on(t.senderId),
    index('idx_business_inquiries_receiver_id').on(t.receiverId),
    index('idx_business_inquiries_status').on(t.status),
    index('idx_business_inquiries_created_at').on(t.createdAt),
  ],
);
