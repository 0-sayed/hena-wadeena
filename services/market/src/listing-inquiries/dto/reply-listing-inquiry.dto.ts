import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const replyListingInquirySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export class ReplyListingInquiryDto extends createZodDto(replyListingInquirySchema) {}
