import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const grantStewardSchema = z.object({
  userId: z.uuid(),
});

export class GrantStewardDto extends createZodDto(grantStewardSchema) {}
