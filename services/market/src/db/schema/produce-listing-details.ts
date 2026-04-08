import { date, index, numeric, text, uuid } from 'drizzle-orm/pg-core';

import { marketSchema } from '../schema';

import { listings } from './listings';

export const produceListingDetails = marketSchema.table(
  'produce_listing_details',
  {
    listingId: uuid('listing_id')
      .primaryKey()
      .references(() => listings.id, { onDelete: 'cascade' }),
    commodityType: text('commodity_type').notNull(),
    quantityKg: numeric('quantity_kg', { precision: 10, scale: 2 }),
    harvestDate: date('harvest_date', { mode: 'string' }),
    storageType: text('storage_type').notNull(),
    certifications: text('certifications').array().notNull().default([]),
    preferredBuyer: text('preferred_buyer').notNull(),
    contactPhone: text('contact_phone'),
    contactWhatsapp: text('contact_whatsapp'),
  },
  (t) => [index('idx_produce_commodity_type').on(t.commodityType)],
);
