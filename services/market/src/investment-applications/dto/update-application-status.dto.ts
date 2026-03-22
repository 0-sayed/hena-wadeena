import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateApplicationStatusSchema = z.object({
  status: z.enum(['reviewed', 'accepted', 'rejected']),
});

export class UpdateApplicationStatusDto extends createZodDto(updateApplicationStatusSchema) {}
