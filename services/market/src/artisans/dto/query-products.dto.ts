import { createZodDto } from 'nestjs-zod';

import { queryProductsSchema } from './artisan.schema';

export class QueryProductsDto extends createZodDto(queryProductsSchema) {}
