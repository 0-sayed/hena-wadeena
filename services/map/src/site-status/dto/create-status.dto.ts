import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { siteStatusEnum } from '../../db/enums';

const createStatusSchema = z.object({
  status: z.enum(siteStatusEnum.enumValues),
  noteAr: z.string().max(500).optional(),
  noteEn: z.string().max(500).optional(),
  validUntil: z.coerce.date().optional(),
});

export class CreateStatusDto extends createZodDto(createStatusSchema) {}
