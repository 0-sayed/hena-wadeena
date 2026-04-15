import { NewsCategory } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createNewsArticleSchema = z.object({
  titleAr: z.string().min(3),
  summaryAr: z.string().min(10).max(300),
  contentAr: z.string().min(50),
  category: z.enum(Object.values(NewsCategory) as [string, ...string[]]),
  coverImage: z.url().optional(),
  authorName: z.string().min(1),
  authorId: z.uuid().optional(),
});

export class CreateNewsArticleDto extends createZodDto(createNewsArticleSchema) {}
