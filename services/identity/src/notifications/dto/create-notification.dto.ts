import { NotificationType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createNotificationSchema = z.object({
  userId: z.uuid(),
  type: z.enum(Object.values(NotificationType) as [string, ...string[]]),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  bodyAr: z.string().min(1).max(1000),
  bodyEn: z.string().min(1).max(1000),
  data: z.record(z.string(), z.unknown()).optional(),
});

export class CreateNotificationDto extends createZodDto(createNotificationSchema) {}
