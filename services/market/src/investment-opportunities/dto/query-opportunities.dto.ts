import { InvestmentSector } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryOpportunitiesSchema = z
  .object({
    sector: z.enum(Object.values(InvestmentSector) as [string, ...string[]]).optional(),
    area: z.string().optional(),
    min_investment: z.coerce.number().int().min(0).optional(),
    max_investment: z.coerce.number().int().min(0).optional(),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (v) =>
      v.min_investment === undefined ||
      v.max_investment === undefined ||
      v.min_investment <= v.max_investment,
    { message: 'min_investment must be <= max_investment', path: ['min_investment'] },
  );

export class QueryOpportunitiesDto extends createZodDto(queryOpportunitiesSchema) {}
