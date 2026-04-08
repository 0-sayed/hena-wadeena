import { ListingCategory } from '@hena-wadeena/types';
import { z } from 'zod';

import { listingBaseSchema } from './listing-base.schema';

export const produceDetailsSchema = z.object({
  commodity_type: z.enum(['dates', 'olives', 'wheat', 'other']),
  storage_type: z.enum(['field', 'warehouse', 'cold_storage']),
  preferred_buyer: z.enum(['any', 'wholesaler', 'exporter', 'local']),
  quantity_kg: z.number().positive().optional(),
  harvest_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  certifications: z.array(z.enum(['organic', 'gap', 'other'])).default([]),
  contact_phone: z.string().optional(),
  contact_whatsapp: z.string().optional(),
});

// For PATCH updates: same shape without certifications default so omitted optional
// fields are left as undefined and won't overwrite existing DB values.
export const produceDetailsUpdateSchema = z.object({
  commodity_type: z.enum(['dates', 'olives', 'wheat', 'other']),
  storage_type: z.enum(['field', 'warehouse', 'cold_storage']),
  preferred_buyer: z.enum(['any', 'wholesaler', 'exporter', 'local']),
  quantity_kg: z.number().positive().optional(),
  harvest_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  certifications: z.array(z.enum(['organic', 'gap', 'other'])).optional(),
  contact_phone: z.string().optional(),
  contact_whatsapp: z.string().optional(),
});

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
    produce_details: z.undefined(),
  }),
]);
