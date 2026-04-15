import { createZodDto } from 'nestjs-zod';

import { createNewsArticleSchema } from './create-news-article.dto';

export class UpdateNewsArticleDto extends createZodDto(createNewsArticleSchema.partial()) {}
