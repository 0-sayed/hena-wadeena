import { InvestmentSector } from '@hena-wadeena/types';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

import { investmentOpportunities } from '../../db/schema/investment-opportunities';

export const opportunityBaseSchema = createInsertSchema(investmentOpportunities)
  .omit({
    id: true,
    ownerId: true,
    status: true,
    isVerified: true,
    isFeatured: true,
    interestCount: true,
    approvedBy: true,
    approvedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    titleAr: z.string().min(3).max(255),
    sector: z.enum(Object.values(InvestmentSector) as [string, ...string[]]),
    minInvestment: z.number().int().min(0),
    maxInvestment: z.number().int().min(0),
    expectedReturnPct: z.number().min(0).max(100).optional(),
    paybackPeriodYears: z.number().positive().optional(),
    incentives: z.array(z.string()).optional(),
    infrastructure: z
      .object({
        water: z.boolean(),
        electricity: z.boolean(),
        road_access: z.boolean(),
        telecom: z.boolean(),
      })
      .optional(),
    contact: z
      .object({
        entity: z.string().optional(),
        person: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().pipe(z.email()).optional(),
      })
      .optional(),
    documents: z.array(z.string().pipe(z.url())).optional(),
    images: z.array(z.string().pipe(z.url())).optional(),
  })
  .refine((v) => v.maxInvestment >= v.minInvestment, {
    message: 'maxInvestment must be >= minInvestment',
    path: ['maxInvestment'],
  });
