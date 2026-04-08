import { ListingCategory } from '@hena-wadeena/types';
import { z } from 'zod';

import { listingBaseSchema } from './listing-base.schema';

export const produceDetailsSchema = z.object({
  commodity_type: z.enum(['dates', 'olives', 'wheat', 'other']),
  storage_type: z.enum(['field', 'warehouse', 'cold_storage']),
  preferred_buyer: z.enum(['any', 'wholesaler', 'exporter', 'local']),
  quantity_kg: z.number().positive().optional(),
  harvest_date: z.string().optional(), // YYYY-MM-DD
  certifications: z.array(z.enum(['organic', 'gap', 'other'])).default([]),
  contact_phone: z.string().optional(),
  contact_whatsapp: z.string().optional(),
});

export type ProduceDetailsInput = z.infer<typeof produceDetailsSchema>;

const nonProduceCategories = Object.values(ListingCategory).filter(
  (c) => c !== ListingCategory.AGRICULTURAL_PRODUCE,
) as [string, ...string[]];

// Concrete object schema used as the DTO class base (TS2509 requires a non-union).
// It includes all base fields plus optional produce_details; the discriminated union
// below is what ZodValidationPipe actually validates at runtime.
export const listingBaseWithProduceSchema = listingBaseSchema.extend({
  produce_details: produceDetailsSchema.optional(),
});

export const createListingSchema = z.discriminatedUnion('category', [
  listingBaseSchema.extend({
    category: z.literal(ListingCategory.AGRICULTURAL_PRODUCE),
    produce_details: produceDetailsSchema,
  }),
  listingBaseSchema.extend({
    category: z.enum(nonProduceCategories),
  }),
]);
