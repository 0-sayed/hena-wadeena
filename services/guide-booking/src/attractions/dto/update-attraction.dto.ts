import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { createAttractionSchema } from './create-attraction.dto';

const updateAttractionSchema = createAttractionSchema.partial().extend({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export class UpdateAttractionDto extends createZodDto(updateAttractionSchema) {}
