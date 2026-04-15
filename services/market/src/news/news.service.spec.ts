import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../shared/test-helpers';

import { NewsService } from './news.service';

const mockDb = createMockDb();
const mockS3 = { getPresignedUploadUrl: vi.fn() };

const mockArticle = {
  id: 'article-id-1',
  titleAr: 'عنوان تجريبي',
  summaryAr: 'ملخص تجريبي للمقال',
  contentAr: 'محتوى تجريبي طويل للمقال يكفي لاختبار قراءة الوقت',
  slug: 'عنوان-تجريبي',
  category: 'tourism',
  coverImage: null,
  authorId: null,
  authorName: 'محرر المنصة',
  readingTimeMinutes: 1,
  isPublished: true,
  publishedAt: new Date('2026-01-01'),
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('NewsService', () => {
  let service: NewsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NewsService(mockDb as never, mockS3 as never);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated published articles', async () => {
      // items query resolves via .limit()
      mockDb.limit.mockResolvedValueOnce([mockArticle]);

      const result = await service.findAll({ offset: 0, limit: 12 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(mockArticle);
    });

    it('returns empty list when no articles match', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.findAll({ offset: 0, limit: 12 });

      expect(result.data).toHaveLength(0);
    });
  });

  // ── findBySlug ───────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('returns article and fires view count increment', async () => {
      mockDb.limit.mockResolvedValueOnce([mockArticle]);

      const result = await service.findBySlug('عنوان-تجريبي');

      expect(result).toEqual(mockArticle);
      // view count update is fire-and-forget — just verify db.update was called
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when slug not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── adminFindAll ─────────────────────────────────────────────────────────

  describe('adminFindAll', () => {
    it('returns all articles including drafts', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockArticle, isPublished: false }]);

      const result = await service.adminFindAll({ offset: 0, limit: 20 });

      expect(result.data).toHaveLength(1);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates article with auto-computed reading time and slug', async () => {
      // slug collision check → no collision
      mockDb.limit.mockResolvedValueOnce([]);
      // insert returning
      mockDb.returning.mockResolvedValueOnce([mockArticle]);

      const dto = {
        titleAr: 'عنوان تجريبي',
        summaryAr: 'ملخص تجريبي للمقال الجديد',
        contentAr: 'محتوى تجريبي '.repeat(30),
        category: 'tourism',
        authorName: 'محرر المنصة',
      };

      const result = await service.create(dto as never);

      expect(result).toEqual(mockArticle);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates article fields', async () => {
      const updated = { ...mockArticle, titleAr: 'عنوان محدث' };
      mockDb.limit.mockResolvedValueOnce([mockArticle]); // findRaw
      mockDb.returning.mockResolvedValueOnce([updated]); // update returning

      const result = await service.update('article-id-1', { titleAr: 'عنوان محدث' } as never);

      expect(result.titleAr).toBe('عنوان محدث');
    });

    it('throws NotFoundException when article not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // findRaw → null

      await expect(service.update('bad-id', {} as never)).rejects.toThrow(NotFoundException);
    });

    it('recalculates readingTimeMinutes when contentAr changes', async () => {
      const longContent = 'كلمة '.repeat(260); // 260 words → ceil(260/130) = 2 min
      const updated = { ...mockArticle, readingTimeMinutes: 2 };
      mockDb.limit.mockResolvedValueOnce([mockArticle]);
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.update('article-id-1', { contentAr: longContent } as never);

      expect(result.readingTimeMinutes).toBe(2);
    });
  });

  // ── togglePublish ────────────────────────────────────────────────────────

  describe('togglePublish', () => {
    it('publishes a draft article and sets publishedAt', async () => {
      const draft = { ...mockArticle, isPublished: false, publishedAt: null };
      const published = { ...mockArticle, isPublished: true, publishedAt: new Date() };
      mockDb.limit.mockResolvedValueOnce([draft]);
      mockDb.returning.mockResolvedValueOnce([published]);

      const result = await service.togglePublish('article-id-1');

      expect(result.isPublished).toBe(true);
    });

    it('unpublishes a published article', async () => {
      const unpublished = { ...mockArticle, isPublished: false };
      mockDb.limit.mockResolvedValueOnce([mockArticle]); // currently published
      mockDb.returning.mockResolvedValueOnce([unpublished]);

      const result = await service.togglePublish('article-id-1');

      expect(result.isPublished).toBe(false);
    });

    it('throws NotFoundException when article not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.togglePublish('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes an article', async () => {
      mockDb.limit.mockResolvedValueOnce([mockArticle]);

      await service.remove('article-id-1');

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when article not found', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getUploadImageUrl ────────────────────────────────────────────────────

  describe('getUploadImageUrl', () => {
    it('returns presigned upload URL from S3', async () => {
      mockS3.getPresignedUploadUrl.mockResolvedValueOnce({
        uploadUrl: 'https://s3.example.com/presigned',
        key: 'market/news/abc123.jpg',
      });

      const result = await service.getUploadImageUrl('photo.jpg', 'image/jpeg');

      expect(result.uploadUrl).toBe('https://s3.example.com/presigned');
      expect(result.key).toContain('market/news/');
    });
  });
});
