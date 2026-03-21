import { CommodityCategory, CommodityUnit } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCommoditySchema = z.object({
  nameAr: z.string().min(1).max(255),
  nameEn: z.string().max(255).optional(),
  category: z.enum(Object.values(CommodityCategory) as [string, ...string[]]),
  unit: z.enum(Object.values(CommodityUnit) as [string, ...string[]]),
  iconUrl: z.url().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export class CreateCommodityDto extends createZodDto(createCommoditySchema) {}
