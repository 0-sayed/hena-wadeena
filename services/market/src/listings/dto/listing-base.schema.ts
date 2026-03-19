import { ListingCategory, ListingType, TransactionType } from '@hena-wadeena/types';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { listings } from '../../db/schema/listings';

export const listingBaseSchema = createInsertSchema(listings)
  .omit({
    id: true,
    ownerId: true,
    status: true,
    isVerified: true,
    isFeatured: true,
    featuredUntil: true,
    isPublished: true,
    approvedBy: true,
    approvedAt: true,
    ratingAvg: true,
    reviewCount: true,
    viewsCount: true,
    slug: true,
    location: true, // geometry type — replaced in extend below
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    titleAr: z.string().min(3).max(255),
    price: z.number().int().positive(),
    category: z.enum(Object.values(ListingCategory) as [string, ...string[]]),
    listingType: z.enum(Object.values(ListingType) as [string, ...string[]]),
    transaction: z.enum(Object.values(TransactionType) as [string, ...string[]]),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  });
