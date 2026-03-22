import { createZodDto } from 'nestjs-zod';

import { createGuideSchema } from './create-guide.dto';

const updateGuideSchema = createGuideSchema.partial();

export class UpdateGuideDto extends createZodDto(updateGuideSchema) {}
