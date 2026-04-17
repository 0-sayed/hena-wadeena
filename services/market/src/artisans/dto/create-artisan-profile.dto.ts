import { createZodDto } from 'nestjs-zod';

import { createArtisanProfileSchema } from './artisan.schema';

export class CreateArtisanProfileDto extends createZodDto(createArtisanProfileSchema) {}
