// services/market/src/admin/dto/verify-listing.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const verifyListingSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

export class VerifyListingDto extends createZodDto(verifyListingSchema) {}
