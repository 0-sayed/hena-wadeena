import { createZodDto } from 'nestjs-zod';

import { paginationSchema } from '../../utils/schemas';

export class StatusBoardQueryDto extends createZodDto(paginationSchema) {}
