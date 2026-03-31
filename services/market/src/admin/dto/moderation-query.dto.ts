import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const moderationQuerySchema = z.object({
  type: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export class ModerationQueryDto extends createZodDto(moderationQuerySchema) {}

export interface ModerationItem {
  id: string;
  type: 'listing' | 'investment' | 'kyc' | 'poi';
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  service: 'identity' | 'market' | 'map';
  actions: {
    approve: string;
    reject: string;
    view: string;
  };
}

export interface ModerationQueueResponse {
  data: ModerationItem[];
  total: number;
  hasMore: boolean;
}
