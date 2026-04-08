import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addBreadcrumbSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export class AddBreadcrumbDto extends createZodDto(addBreadcrumbSchema) {}
