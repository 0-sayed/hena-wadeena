// services/market/src/admin/dto/query-admin-listings.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryAdminListingsSchema = z.object({
  status: z.enum(['draft', 'active', 'suspended']).optional(),
  is_verified: z
    .enum(['true', 'false'])
    .transform((v: string) => v === 'true')
    .optional(),
  is_featured: z
    .enum(['true', 'false'])
    .transform((v: string) => v === 'true')
    .optional(),
  owner_id: z.uuid().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(
      /^(created_at|price|rating_avg|views_count)\|(asc|desc)$/,
      'sort must be field|direction (e.g. created_at|desc)',
    )
    .optional(),
});

export class QueryAdminListingsDto extends createZodDto(queryAdminListingsSchema) {}
