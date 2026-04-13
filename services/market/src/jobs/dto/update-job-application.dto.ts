import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateJobApplicationSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'in_progress', 'completed']),
});

export class UpdateJobApplicationDto extends createZodDto(updateJobApplicationSchema) {}
