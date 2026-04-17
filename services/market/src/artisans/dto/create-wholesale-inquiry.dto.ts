import { createZodDto } from 'nestjs-zod';

import { createWholesaleInquirySchema } from './artisan.schema';

export class CreateWholesaleInquiryDto extends createZodDto(createWholesaleInquirySchema) {}
