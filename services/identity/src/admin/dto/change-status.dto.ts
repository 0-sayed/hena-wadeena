import { UserStatus } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const changeStatusSchema = z.object({
  status: z.enum(Object.values(UserStatus) as [string, ...string[]]),
  reason: z.string().max(500).optional(),
});

export class ChangeStatusDto extends createZodDto(changeStatusSchema) {}
