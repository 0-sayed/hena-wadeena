import { generateId } from '@hena-wadeena/nest-common';
import { boolean, index, integer, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { alertDirectionEnum } from '../enums';
import { marketSchema } from '../schema';

import { commodities } from './commodities';

export const priceAlertSubscriptions = marketSchema.table(
  'price_alert_subscriptions',
  {
    id: uuid().primaryKey().$defaultFn(generateId),
    userId: uuid('user_id').notNull(),
    commodityId: uuid('commodity_id')
      .notNull()
      .references(() => commodities.id),
    thresholdPrice: integer('threshold_price').notNull(),
    direction: alertDirectionEnum('direction').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.userId, t.commodityId, t.direction),
    index('idx_price_alert_commodity').on(t.commodityId),
  ],
);

export type PriceAlertSubscription = typeof priceAlertSubscriptions.$inferSelect;
export type InsertPriceAlertSubscription = typeof priceAlertSubscriptions.$inferInsert;
