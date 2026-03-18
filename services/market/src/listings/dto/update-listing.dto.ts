import { createZodDto } from 'nestjs-zod';

import { listingBaseSchema } from './listing-base.schema';

export class UpdateListingDto extends createZodDto(listingBaseSchema.partial()) {}
