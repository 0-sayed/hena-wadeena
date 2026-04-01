import { generateId } from '@hena-wadeena/nest-common';
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { listingInquiryStatusEnum } from '../enums';
import { marketSchema } from '../schema';

import { listings } from './listings';

export const listingInquiries = marketSchema.table(
  'listing_inquiries',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull(),
    receiverId: uuid('receiver_id').notNull(),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    message: text().notNull(),
    replyMessage: text('reply_message'),
    status: listingInquiryStatusEnum('status').default('pending').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_listing_inquiries_listing_id').on(t.listingId),
    index('idx_listing_inquiries_sender_id').on(t.senderId),
    index('idx_listing_inquiries_receiver_id').on(t.receiverId),
    index('idx_listing_inquiries_status').on(t.status),
    index('idx_listing_inquiries_created_at').on(t.createdAt),
  ],
);
