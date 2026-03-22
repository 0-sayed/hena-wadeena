import { createZodDto } from 'nestjs-zod';

import { opportunityBaseSchema } from './opportunity-base.schema';

export class CreateOpportunityDto extends createZodDto(opportunityBaseSchema) {}
