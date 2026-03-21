import { UserRole, UserStatus } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryUsersSchema = z.object({
  search: z.string().min(1).max(100).optional(),
  role: z.enum(Object.values(UserRole) as [string, ...string[]]).optional(),
  status: z.enum(Object.values(UserStatus) as [string, ...string[]]).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(
      /^(created_at|full_name|last_login_at)\|(asc|desc)$/,
      'sort must be field|direction (e.g. created_at|desc)',
    )
    .optional(),
});

export class QueryUsersDto extends createZodDto(queryUsersSchema) {}
