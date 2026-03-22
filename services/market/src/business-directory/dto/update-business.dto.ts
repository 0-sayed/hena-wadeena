import { createZodDto } from 'nestjs-zod';

import { createBusinessSchema } from './create-business.dto';

const updateBusinessSchema = createBusinessSchema.partial();

export class UpdateBusinessDto extends createZodDto(updateBusinessSchema) {}
