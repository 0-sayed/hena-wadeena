import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { incidentTypeEnum } from '../../db/enums';

const createIncidentSchema = z.object({
  incidentType: z.enum(incidentTypeEnum.enumValues),
  descriptionAr: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photos: z.array(z.string()).max(5).optional(),
});

export class CreateIncidentDto extends createZodDto(createIncidentSchema) {}
