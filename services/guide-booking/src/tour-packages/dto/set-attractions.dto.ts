import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const setAttractionsSchema = z.object({
  attractions: z.array(
    z.object({
      attractionId: z.uuid(),
      sortOrder: z.number().int().min(0).optional(),
    }),
  ),
});

export class SetAttractionsDto extends createZodDto(setAttractionsSchema) {}
