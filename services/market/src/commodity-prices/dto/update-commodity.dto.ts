import { createZodDto } from 'nestjs-zod';

import { createCommoditySchema } from './create-commodity.dto';

export class UpdateCommodityDto extends createZodDto(createCommoditySchema.partial()) {}
