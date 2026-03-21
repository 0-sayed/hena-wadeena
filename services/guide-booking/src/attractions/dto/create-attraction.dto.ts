import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
  attractionAreaEnum,
  attractionTypeEnum,
  bestSeasonEnum,
  bestTimeOfDayEnum,
  difficultyEnum,
} from '../../db/enums';

export const createAttractionSchema = z.object({
  nameAr: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  type: z.enum(attractionTypeEnum.enumValues),
  area: z.enum(attractionAreaEnum.enumValues),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  historyAr: z.string().optional(),
  bestSeason: z.enum(bestSeasonEnum.enumValues).optional(),
  bestTimeOfDay: z.enum(bestTimeOfDayEnum.enumValues).optional(),
  entryFee: z
    .object({
      adultsPiasters: z.number().int().min(0),
      childrenPiasters: z.number().int().min(0).optional(),
      foreignersPiasters: z.number().int().min(0).optional(),
    })
    .optional(),
  openingHours: z.string().optional(),
  durationHours: z.number().positive().optional(),
  difficulty: z.enum(difficultyEnum.enumValues).optional(),
  tips: z.array(z.string()).optional(),
  nearbySlugs: z.array(z.string()).optional(),
  location: z
    .object({
      x: z.number().min(-180).max(180), // longitude
      y: z.number().min(-90).max(90), // latitude
    })
    .optional(),
  images: z.array(z.string().min(1)).optional(),
  thumbnail: z.string().min(1).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export class CreateAttractionDto extends createZodDto(createAttractionSchema) {}
