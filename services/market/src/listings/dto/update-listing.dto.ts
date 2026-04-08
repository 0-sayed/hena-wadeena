import { createZodDto } from 'nestjs-zod';

import { produceDetailsSchema } from './create-listing.schema';
import { listingBaseSchema } from './listing-base.schema';

const updateListingSchema = listingBaseSchema.partial().extend({
  produce_details: produceDetailsSchema.optional(),
});

export class UpdateListingDto extends createZodDto(updateListingSchema) {}
