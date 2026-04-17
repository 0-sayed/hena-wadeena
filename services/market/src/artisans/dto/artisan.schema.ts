import { ARTISAN_AREAS, CRAFT_TYPES, WHOLESALE_INQUIRY_STATUSES } from '@hena-wadeena/types';
import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;
const mediaKeySchema = z.string().trim().min(1, 'Media key cannot be empty');

export const createArtisanProfileSchema = z.object({
  nameAr: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional().nullable(),
  bioAr: z.string().max(2000).optional().nullable(),
  bioEn: z.string().max(2000).optional().nullable(),
  craftTypes: z.array(z.enum(CRAFT_TYPES)).min(1),
  area: z.enum(ARTISAN_AREAS),
  whatsapp: z.string().regex(phoneRegex, 'Invalid phone number (E.164 format required)'),
  profileImageKey: mediaKeySchema.optional().nullable(),
});

export const updateArtisanProfileSchema = createArtisanProfileSchema.partial();

export const createArtisanProductSchema = z.object({
  nameAr: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional().nullable(),
  descriptionAr: z.string().max(2000).optional().nullable(),
  descriptionEn: z.string().max(2000).optional().nullable(),
  craftType: z.enum(CRAFT_TYPES),
  price: z.number().int().min(1).optional().nullable(),
  minOrderQty: z.number().int().min(1).default(1),
  imageKeys: z.array(mediaKeySchema).max(5).default([]),
  available: z.boolean().default(true),
});

export const updateArtisanProductSchema = createArtisanProductSchema.partial();

export const createWholesaleInquirySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email().optional().nullable(),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  message: z.string().max(2000).optional().nullable(),
  quantity: z.number().int().min(1).optional().nullable(),
});

export const updateInquiryStatusSchema = z.object({
  status: z.enum(WHOLESALE_INQUIRY_STATUSES),
});

export const queryArtisansSchema = z.object({
  area: z.enum(ARTISAN_AREAS).optional(),
  craftType: z.enum(CRAFT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const queryProductsSchema = z.object({
  craftType: z.enum(CRAFT_TYPES).optional(),
  available: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
