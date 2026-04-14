import type { NewsCategory } from '../enums';

export interface NewsArticle {
  id: string;
  titleAr: string;
  summaryAr: string;
  contentAr: string;
  slug: string;
  category: NewsCategory;
  coverImage: string | null;
  authorId: string | null;
  authorName: string;
  readingTimeMinutes: number;
  isPublished: boolean;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsArticlePayload {
  titleAr: string;
  summaryAr: string;
  contentAr: string;
  category: NewsCategory;
  coverImage?: string;
  authorName: string;
  authorId?: string;
}

export type UpdateNewsArticlePayload = Partial<CreateNewsArticlePayload>;
