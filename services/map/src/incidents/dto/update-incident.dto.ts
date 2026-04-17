import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { incidentStatusEnum } from '../../db/enums';

const updateIncidentSchema = z.object({
  status: z.enum(incidentStatusEnum.enumValues).optional(),
  adminNotes: z.string().max(2000).optional(),
  eeaaReference: z.string().max(100).optional(),
});

export class UpdateIncidentDto extends createZodDto(updateIncidentSchema) {}
