import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createReviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().min(1).max(2000),
  images: z.array(z.url()).max(10).optional(),
});

export class CreateReviewDto extends createZodDto(createReviewSchema) {}
