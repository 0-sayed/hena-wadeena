import { ListingCategory } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';

import { produceDetailsUpdateSchema } from './create-listing.schema';
import { listingBaseSchema } from './listing-base.schema';

const nonProduceCategories: string[] = Object.values(ListingCategory).filter(
  (c) => c !== ListingCategory.AGRICULTURAL_PRODUCE,
);

const updateListingSchema = listingBaseSchema
  .partial()
  .extend({
    produce_details: produceDetailsUpdateSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.produce_details !== undefined &&
      data.category !== undefined &&
      nonProduceCategories.includes(data.category)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'produce_details is not allowed for non-agricultural_produce listings',
        path: ['produce_details'],
      });
    }
  });

export class UpdateListingDto extends createZodDto(updateListingSchema) {}
