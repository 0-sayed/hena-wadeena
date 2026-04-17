import { createZodDto } from 'nestjs-zod';

import { createArtisanProductSchema } from './artisan.schema';

export class CreateArtisanProductDto extends createZodDto(createArtisanProductSchema) {}
