import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const replyReviewSchema = z.object({
  guideReply: z.string().min(1).max(2000),
});

export class ReplyReviewDto extends createZodDto(replyReviewSchema) {}
