import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const applyJobSchema = z.object({
  noteAr: z.string().max(500).optional(),
});

export class ApplyJobDto extends createZodDto(applyJobSchema) {}
