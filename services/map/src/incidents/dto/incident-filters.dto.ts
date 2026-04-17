import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { incidentStatusEnum, incidentTypeEnum } from '../../db/enums';
import { paginationSchema } from '../../utils/schemas';

const incidentFiltersSchema = paginationSchema.extend({
  status: z.enum(incidentStatusEnum.enumValues).optional(),
  incidentType: z.enum(incidentTypeEnum.enumValues).optional(),
});

export class IncidentFiltersDto extends createZodDto(incidentFiltersSchema) {}
