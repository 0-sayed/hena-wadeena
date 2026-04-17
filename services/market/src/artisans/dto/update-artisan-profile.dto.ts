import { createZodDto } from 'nestjs-zod';

import { updateArtisanProfileSchema } from './artisan.schema';

export class UpdateArtisanProfileDto extends createZodDto(updateArtisanProfileSchema) {}
