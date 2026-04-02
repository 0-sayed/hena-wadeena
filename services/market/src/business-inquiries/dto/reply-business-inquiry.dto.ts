import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const replyBusinessInquirySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export class ReplyBusinessInquiryDto extends createZodDto(replyBusinessInquirySchema) {}
