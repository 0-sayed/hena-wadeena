import { createZodDto } from 'nestjs-zod';

import { queryArtisansSchema } from './artisan.schema';

export class QueryArtisansDto extends createZodDto(queryArtisansSchema) {}
