import { DRIZZLE_CLIENT, S3Service, generateId } from '@hena-wadeena/nest-common';
import { NewsCategory, slugify } from '@hena-wadeena/types';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { newsArticles } from '../db/schema/news-articles';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { AdminQueryNewsDto, QueryNewsDto } from './dto/query-news.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';

@Injectable()
export class NewsService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly s3: S3Service,
  ) {}

  // ── Public ────────────────────────────────────────────────────────────────

  async findAll(query: QueryNewsDto) {
    const conditions = [
      isNull(newsArticles.deletedAt),
      eq(newsArticles.isPublished, true),
      query.category ? eq(newsArticles.category, query.category as NewsCategory) : undefined,
    ];

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsArticles)
      .where(andRequired(...conditions));

    const items = await this.db
      .select()
      .from(newsArticles)
      .where(andRequired(...conditions))
      .orderBy(desc(newsArticles.publishedAt))
      .offset(query.offset)
      .limit(query.limit);

    return paginate(items, countResult?.count ?? 0, query.offset, query.limit);
  }

  async findBySlug(slug: string) {
    const [article] = await this.db
      .select()
      .from(newsArticles)
      .where(
        andRequired(
          eq(newsArticles.slug, slug),
          eq(newsArticles.isPublished, true),
          isNull(newsArticles.deletedAt),
        ),
      )
      .limit(1);

    if (!article) throw new NotFoundException('Article not found');

    // Fire-and-forget view count increment
    void Promise.resolve(
      this.db
        .update(newsArticles)
        .set({ viewCount: sql`${newsArticles.viewCount} + 1` })
        .where(eq(newsArticles.id, article.id)),
    ).catch(() => null);

    return article;
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminFindAll(query: AdminQueryNewsDto) {
    const conditions = [
      isNull(newsArticles.deletedAt),
      query.category ? eq(newsArticles.category, query.category as NewsCategory) : undefined,
      query.status === 'published'
        ? eq(newsArticles.isPublished, true)
        : query.status === 'draft'
          ? eq(newsArticles.isPublished, false)
          : undefined,
    ];

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsArticles)
      .where(andRequired(...conditions));

    const items = await this.db
      .select()
      .from(newsArticles)
      .where(andRequired(...conditions))
      .orderBy(desc(newsArticles.createdAt))
      .offset(query.offset)
      .limit(query.limit);

    return paginate(items, countResult?.count ?? 0, query.offset, query.limit);
  }

  async create(dto: CreateNewsArticleDto) {
    const words = dto.contentAr.split(/\s+/).filter(Boolean).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 130));

    let slug = slugify(dto.titleAr);

    // Collision check
    const [existing] = await this.db
      .select({ id: newsArticles.id })
      .from(newsArticles)
      .where(eq(newsArticles.slug, slug))
      .limit(1);

    if (existing) {
      slug = `${slug}-${generateId().slice(0, 6)}`;
    }

    return firstOrThrow(
      await this.db
        .insert(newsArticles)
        .values({
          titleAr: dto.titleAr,
          summaryAr: dto.summaryAr,
          contentAr: dto.contentAr,
          slug,
          category: dto.category as NewsCategory,
          coverImage: dto.coverImage ?? null,
          authorId: dto.authorId ?? null,
          authorName: dto.authorName,
          readingTimeMinutes,
        })
        .returning(),
    );
  }

  async update(id: string, dto: UpdateNewsArticleDto) {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Article not found');

    const updates: Partial<typeof newsArticles.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (dto.titleAr !== undefined) updates.titleAr = dto.titleAr;
    if (dto.summaryAr !== undefined) updates.summaryAr = dto.summaryAr;
    if (dto.contentAr !== undefined) {
      updates.contentAr = dto.contentAr;
      const words = dto.contentAr.split(/\s+/).filter(Boolean).length;
      updates.readingTimeMinutes = Math.max(1, Math.ceil(words / 130));
    }
    if (dto.category !== undefined) updates.category = dto.category as NewsCategory;
    if (dto.coverImage !== undefined) updates.coverImage = dto.coverImage;
    if (dto.authorName !== undefined) updates.authorName = dto.authorName;
    if (dto.authorId !== undefined) updates.authorId = dto.authorId;

    return firstOrThrow(
      await this.db
        .update(newsArticles)
        .set(updates)
        .where(and(eq(newsArticles.id, id), isNull(newsArticles.deletedAt)))
        .returning(),
    );
  }

  async togglePublish(id: string) {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Article not found');

    const nowPublishing = !existing.isPublished;
    const updates: Partial<typeof newsArticles.$inferInsert> & { updatedAt: Date } = {
      isPublished: nowPublishing,
      updatedAt: new Date(),
    };

    if (nowPublishing && !existing.publishedAt) {
      updates.publishedAt = new Date();
    }

    return firstOrThrow(
      await this.db
        .update(newsArticles)
        .set(updates)
        .where(and(eq(newsArticles.id, id), isNull(newsArticles.deletedAt)))
        .returning(),
    );
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findRaw(id);
    if (!existing) throw new NotFoundException('Article not found');

    await this.db
      .update(newsArticles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(newsArticles.id, id));
  }

  async getUploadImageUrl(filename: string, contentType: string) {
    const allowedTypes = new Map<string, string>([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ]);

    const ext = allowedTypes.get(contentType);
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    const key = `market/news/${generateId()}.${ext}`;
    return this.s3.getPresignedUploadUrl({ key, contentType, expiresIn: 300 });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async findRaw(id: string) {
    const [article] = await this.db
      .select()
      .from(newsArticles)
      .where(and(eq(newsArticles.id, id), isNull(newsArticles.deletedAt)))
      .limit(1);
    return article ?? null;
  }
}
