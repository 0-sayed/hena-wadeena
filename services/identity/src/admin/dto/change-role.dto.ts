import { UserRole } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const changeRoleSchema = z.object({
  role: z.enum(Object.values(UserRole) as [string, ...string[]]),
});

export class ChangeRoleDto extends createZodDto(changeRoleSchema) {}
