import { createZodDto } from 'nestjs-zod';

import { listingBaseSchema } from './listing-base.schema';

export class CreateListingDto extends createZodDto(listingBaseSchema) {}
