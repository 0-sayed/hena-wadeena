import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(255).optional(),
    comment: z.string().min(1).max(2000).optional(),
    images: z.array(z.url()).max(10).optional(),
  })
  .refine((data) => (Object.values(data) as unknown[]).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export class UpdateReviewDto extends createZodDto(updateReviewSchema) {}
