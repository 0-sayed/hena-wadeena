import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../shared/test-helpers';

import { BenefitsService } from './benefits.service';

const mockBenefit = {
  id: '019500a0-0001-7000-8000-000000000001',
  slug: 'takaful-wa-karama',
  nameAr: 'تكافل وكرامة',
  nameEn: 'Takaful wa Karama',
  ministryAr: 'وزارة التضامن الاجتماعي',
  documentsAr: ['بطاقة الرقم القومي'],
  officeNameAr: 'مكتب الخارجة',
  officePhone: '0922500001',
  officeAddressAr: 'شارع جمال عبد الناصر',
  enrollmentNotesAr: 'تقدم بطلب في مكتب التضامن',
  updatedAt: new Date('2026-01-01'),
};

describe('BenefitsService', () => {
  let service: BenefitsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    service = new BenefitsService(mockDb as never);
  });

  describe('list', () => {
    it('returns all benefit records ordered by slug', async () => {
      mockDb.orderBy.mockResolvedValueOnce([mockBenefit]);
      const result = await service.list();
      expect(result).toEqual([mockBenefit]);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('returns the record for a valid slug', async () => {
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([mockBenefit]);
      });
      const result = await service.findBySlug('takaful-wa-karama');
      expect(result).toEqual(mockBenefit);
    });

    it('throws NotFoundException for unknown slug', async () => {
      mockDb.then.mockImplementationOnce((resolve?: (v: unknown[]) => void) => {
        resolve?.([]);
      });
      await expect(service.findBySlug('unknown-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('inserts and returns the created benefit', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBenefit]);
      const dto = {
        slug: 'takaful-wa-karama',
        nameAr: 'تكافل وكرامة',
        nameEn: 'Takaful wa Karama',
        ministryAr: 'وزارة التضامن الاجتماعي',
        documentsAr: ['بطاقة الرقم القومي'],
        officeNameAr: 'مكتب الخارجة',
        officePhone: '0922500001',
        officeAddressAr: 'شارع جمال عبد الناصر',
        enrollmentNotesAr: 'تقدم بطلب في مكتب التضامن',
      };
      const result = await service.create(dto as never);
      expect(result).toEqual(mockBenefit);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(dto);
    });
  });

  describe('delete', () => {
    it('removes the record and returns it', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBenefit]);
      const result = await service.delete('takaful-wa-karama');
      expect(result).toEqual(mockBenefit);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when slug does not exist', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('persists partial changes and returns updated record', async () => {
      const updated = { ...mockBenefit, officePhone: '0911111111' };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await service.update('takaful-wa-karama', {
        officePhone: '0911111111',
      } as never);

      expect(result).toEqual(updated);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ officePhone: '0911111111', updatedAt: expect.any(Date) }),
      );
    });

    it('always stamps updatedAt regardless of which fields change', async () => {
      mockDb.returning.mockResolvedValueOnce([mockBenefit]);
      await service.update('takaful-wa-karama', { officePhone: '09' } as never);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      );
    });

    it('throws NotFoundException when slug does not exist', async () => {
      mockDb.returning.mockResolvedValueOnce([]);
      await expect(service.update('nonexistent', { officePhone: '09' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
