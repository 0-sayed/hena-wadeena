import { ReviewDirection } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createReviewSchema = z.object({
  direction: z.enum(Object.values(ReviewDirection) as [string, ...string[]]),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export class CreateReviewDto extends createZodDto(createReviewSchema) {}
