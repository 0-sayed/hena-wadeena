import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { paginationSchema } from '../../utils/schemas';

const statusBoardQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
});

export class StatusBoardQueryDto extends createZodDto(statusBoardQuerySchema) {}
