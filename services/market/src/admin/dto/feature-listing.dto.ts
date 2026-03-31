// services/market/src/admin/dto/feature-listing.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const featureListingSchema = z.object({
  featured: z.boolean(),
  featuredUntil: z.coerce.date().optional(),
});

export class FeatureListingDto extends createZodDto(featureListingSchema) {}
