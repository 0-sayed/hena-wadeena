import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createJobReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export class CreateJobReviewDto extends createZodDto(createJobReviewSchema) {}
