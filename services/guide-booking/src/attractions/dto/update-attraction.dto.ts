import { createZodDto } from 'nestjs-zod';

import { createAttractionSchema } from './create-attraction.dto';

const updateAttractionSchema = createAttractionSchema.partial();

export class UpdateAttractionDto extends createZodDto(updateAttractionSchema) {}
