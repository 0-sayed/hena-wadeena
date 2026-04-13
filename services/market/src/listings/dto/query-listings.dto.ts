import { ListingCategory, ListingType, TransactionType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { produceDetailsSchema } from './create-listing.schema';

const queryListingsSchema = z
  .object({
    category: z.enum(Object.values(ListingCategory) as [string, ...string[]]).optional(),
    sub_category: z.string().optional(),
    listing_type: z.enum(Object.values(ListingType) as [string, ...string[]]).optional(),
    transaction: z.enum(Object.values(TransactionType) as [string, ...string[]]).optional(),
    area: z.string().optional(), // maps to `district` column
    tags: z.string().optional(), // comma-separated, AND semantics
    min_price: z.coerce.number().int().min(0).optional(),
    max_price: z.coerce.number().int().min(0).optional(),
    is_verified: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    is_featured: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    commodity_type: produceDetailsSchema.shape.commodity_type.optional(),
    q: z.string().trim().min(1).max(128).optional(),
    min_rating: z.coerce.number().min(1).max(5).optional(),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
      .string()
      .regex(
        /^(created_at|price|rating_avg|views_count)\|(asc|desc)$/,
        'sort must be field|direction (e.g. price|asc)',
      )
      .optional(),
  })
  .refine(
    (v) => v.min_price === undefined || v.max_price === undefined || v.min_price <= v.max_price,
    { message: 'min_price must be <= max_price', path: ['min_price'] },
  );

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().positive().max(100).default(10),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const imageUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export class QueryListingsDto extends createZodDto(queryListingsSchema) {}
export class NearbyQueryDto extends createZodDto(nearbyQuerySchema) {}
export class ImageUploadDto extends createZodDto(imageUploadSchema) {}
