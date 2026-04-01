import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createListingInquirySchema = z.object({
  contactName: z.string().trim().min(1).max(120),
  contactEmail: z.email().optional(),
  contactPhone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(1).max(2000),
});

export class CreateListingInquiryDto extends createZodDto(createListingInquirySchema) {}
