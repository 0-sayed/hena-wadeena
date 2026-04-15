import { generateId } from '@hena-wadeena/nest-common';
import { boolean, index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { newsCategoryEnum } from '../enums';
import { marketSchema } from '../schema';

export const newsArticles = marketSchema.table(
  'news_articles',
  {
    id: uuid('id').primaryKey().$defaultFn(generateId),
    titleAr: text('title_ar').notNull(),
    summaryAr: text('summary_ar').notNull(),
    contentAr: text('content_ar').notNull(),
    slug: text('slug').notNull().unique(),
    category: newsCategoryEnum('category').notNull(),
    coverImage: text('cover_image'),
    authorId: uuid('author_id'),
    authorName: text('author_name').notNull(),
    readingTimeMinutes: integer('reading_time_minutes').notNull().default(1),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_news_category_published').on(t.category, t.isPublished, t.publishedAt),
    index('idx_news_deleted_at').on(t.deletedAt),
  ],
);
