import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const applyJobSchema = z.object({
  noteAr: z.string().trim().max(1000).optional(),
});

export class ApplyJobDto extends createZodDto(applyJobSchema) {}
