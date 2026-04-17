import { index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { wholesaleInquiryStatusEnum } from '../enums';
import { marketSchema } from '../schema';

import { artisanProducts } from './artisan-products';
import { artisanProfiles } from './artisan-profiles';

export const wholesaleInquiries = marketSchema.table(
  'wholesale_inquiries',
  {
    id: uuid('id').primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => artisanProducts.id),
    artisanId: uuid('artisan_id')
      .notNull()
      .references(() => artisanProfiles.id),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    message: text('message'),
    quantity: integer('quantity'),
    status: wholesaleInquiryStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    index('wholesale_inquiries_artisan_id_idx').on(table.artisanId),
    index('wholesale_inquiries_product_id_idx').on(table.productId),
    index('wholesale_inquiries_status_idx').on(table.status),
    index('wholesale_inquiries_created_at_idx').on(table.createdAt),
  ],
);
