import { createZodDto } from 'nestjs-zod';

import { createListingSchema, listingBaseWithProduceSchema } from './create-listing.schema';

// Build the DTO from the concrete object schema (TS2509 requires non-union base).
// After class creation, replace .schema with the full discriminated-union schema so
// ZodValidationPipe enforces produce_details requirements at runtime.
export class CreateListingDto extends createZodDto(listingBaseWithProduceSchema) {}

// ZodValidationPipe reads `metatype.schema` — point it at the discriminated union.
(CreateListingDto as { schema: unknown }).schema = createListingSchema;
