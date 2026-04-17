import { createZodDto } from 'nestjs-zod';

import { updateInquiryStatusSchema } from './artisan.schema';

export class UpdateInquiryStatusDto extends createZodDto(updateInquiryStatusSchema) {}
