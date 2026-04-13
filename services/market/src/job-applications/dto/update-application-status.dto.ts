import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Poster-only transitions (applicant withdrawal goes through DELETE endpoint)
const updateApplicationStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'in_progress', 'completed']),
});

export class UpdateApplicationStatusDto extends createZodDto(updateApplicationStatusSchema) {}
