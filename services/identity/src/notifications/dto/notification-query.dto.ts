import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export class NotificationQueryDto extends createZodDto(notificationQuerySchema) {}
