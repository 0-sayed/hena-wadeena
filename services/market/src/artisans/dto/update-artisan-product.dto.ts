import { createZodDto } from 'nestjs-zod';

import { updateArtisanProductSchema } from './artisan.schema';

export class UpdateArtisanProductDto extends createZodDto(updateArtisanProductSchema) {}
