import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../shared/test-helpers';

import { ArtisansService } from './artisans.service';

const now = new Date('2026-01-01');

const mockProfileRow = {
  id: '019500a0-0001-7000-8000-000000000001',
  userId: '019500a0-0001-7000-8000-000000000099',
  nameAr: 'فاطمة',
  nameEn: null,
  bioAr: null,
  bioEn: null,
  craftTypes: ['palm_leaf'],
  area: 'الخارجة',
  whatsapp: '+201234567890',
  profileImageKey: null,
  verifiedAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const mockProductRow = {
  id: '019500a0-0002-7000-8000-000000000001',
  artisanId: mockProfileRow.id,
  nameAr: 'سلة نخيل',
  nameEn: null,
  descriptionAr: null,
  descriptionEn: null,
  craftType: 'palm_leaf',
  price: null,
  minOrderQty: 1,
  imageKeys: [],
  qrCodeKey: null,
  available: true,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const mockInquiryRow = {
  id: '019500a0-0003-7000-8000-000000000001',
  productId: mockProductRow.id,
  artisanId: mockProfileRow.id,
  name: 'Ahmed',
  email: null,
  phone: '+201111111111',
  message: null,
  quantity: null,
  status: 'pending',
  createdAt: now,
  readAt: null,
};

describe('ArtisansService', () => {
  let service: ArtisansService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockQr: { generateAndUpload: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = createMockDb();
    mockQr = { generateAndUpload: vi.fn() };
    vi.clearAllMocks();
    service = new ArtisansService(mockDb as never, mockQr as never);
  });

  describe('createProfile', () => {
    it('creates a profile and returns the mapped domain object', async () => {
      // findProfileByUserId → no existing profile
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.returning.mockResolvedValueOnce([mockProfileRow]);

      const result = await service.createProfile(mockProfileRow.userId, {
        nameAr: 'فاطمة',
        craftTypes: ['palm_leaf'],
        area: 'الخارجة',
        whatsapp: '+201234567890',
      } as never);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockProfileRow.id,
          userId: mockProfileRow.userId,
          nameAr: 'فاطمة',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          verifiedAt: null,
        }),
      );
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockProfileRow.userId,
          nameAr: 'فاطمة',
        }),
      );
    });

    it('throws ConflictException when profile already exists for the user', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);

      await expect(
        service.createProfile(mockProfileRow.userId, {
          nameAr: 'فاطمة',
          craftTypes: ['palm_leaf'],
          area: 'الخارجة',
          whatsapp: '+201234567890',
        } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyProfile', () => {
    it('returns the mapped profile when it exists', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);

      const result = await service.getMyProfile(mockProfileRow.userId);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockProfileRow.id,
          userId: mockProfileRow.userId,
          nameAr: 'فاطمة',
          createdAt: now.toISOString(),
        }),
      );
    });

    it('throws NotFoundException when no profile exists for the user', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.getMyProfile('missing-user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('performs a partial update and returns the mapped profile', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      const updatedRow = { ...mockProfileRow, nameAr: 'فاطمة الجديدة' };
      mockDb.returning.mockResolvedValueOnce([updatedRow]);

      const result = await service.updateMyProfile(mockProfileRow.userId, {
        nameAr: 'فاطمة الجديدة',
      } as never);

      expect(result.nameAr).toBe('فاطمة الجديدة');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          nameAr: 'فاطمة الجديدة',
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.updateMyProfile('missing-user', { nameAr: 'x' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProduct', () => {
    it('creates a product, generates a QR code, and returns mapped product', async () => {
      // findProfileByUserId
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      // insert().returning()
      mockDb.returning.mockResolvedValueOnce([mockProductRow]);

      const qrKey = `artisans/qr/${mockProductRow.id}.png`;
      mockQr.generateAndUpload.mockResolvedValueOnce(qrKey);

      // update().returning() for QR update
      const withQr = { ...mockProductRow, qrCodeKey: qrKey };
      mockDb.returning.mockResolvedValueOnce([withQr]);

      const result = await service.createProduct(mockProfileRow.userId, {
        nameAr: 'سلة نخيل',
        craftType: 'palm_leaf',
        minOrderQty: 1,
        imageKeys: [],
        available: true,
      } as never);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockProductRow.id,
          artisanId: mockProfileRow.id,
          nameAr: 'سلة نخيل',
          qrCodeKey: qrKey,
        }),
      );
      expect(mockQr.generateAndUpload).toHaveBeenCalledWith(mockProductRow.id);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('throws NotFoundException when the user has no artisan profile', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.createProduct('missing-user', {
          nameAr: 'سلة نخيل',
          craftType: 'palm_leaf',
          minOrderQty: 1,
          imageKeys: [],
          available: true,
        } as never),
      ).rejects.toThrow(NotFoundException);
      expect(mockQr.generateAndUpload).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('soft deletes the product for the owning artisan', async () => {
      // findProfileByUserId
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      // findProductById
      mockDb.limit.mockResolvedValueOnce([mockProductRow]);

      await service.deleteProduct(mockProfileRow.userId, mockProductRow.id);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('throws ForbiddenException when product belongs to a different artisan', async () => {
      const otherProfile = { ...mockProfileRow, id: 'different-artisan-id' };
      mockDb.limit.mockResolvedValueOnce([otherProfile]);
      mockDb.limit.mockResolvedValueOnce([mockProductRow]);

      await expect(service.deleteProduct(otherProfile.userId, mockProductRow.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.deleteProduct(mockProfileRow.userId, 'missing-product-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user has no artisan profile', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.deleteProduct('missing-user', mockProductRow.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submitInquiry', () => {
    it('inserts an inquiry and returns the mapped domain object', async () => {
      // findProductById
      mockDb.limit.mockResolvedValueOnce([mockProductRow]);
      mockDb.returning.mockResolvedValueOnce([mockInquiryRow]);

      const result = await service.submitInquiry(mockProductRow.id, {
        name: 'Ahmed',
        phone: '+201111111111',
      } as never);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockInquiryRow.id,
          productId: mockProductRow.id,
          artisanId: mockProfileRow.id,
          name: 'Ahmed',
          phone: '+201111111111',
          status: 'pending',
        }),
      );
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: mockProductRow.id,
          artisanId: mockProductRow.artisanId,
          name: 'Ahmed',
          phone: '+201111111111',
        }),
      );
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.submitInquiry('missing-product', {
          name: 'Ahmed',
          phone: '+201111111111',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInquiryStatus', () => {
    it('updates the inquiry status for the owning artisan', async () => {
      // findProfileByUserId
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      // inquiry lookup
      mockDb.limit.mockResolvedValueOnce([mockInquiryRow]);

      const updatedRow = { ...mockInquiryRow, status: 'read', readAt: new Date('2026-01-02') };
      mockDb.returning.mockResolvedValueOnce([updatedRow]);

      const result = await service.updateInquiryStatus(mockProfileRow.userId, mockInquiryRow.id, {
        status: 'read',
      } as never);

      expect(result.status).toBe('read');
      expect(result.readAt).toBe('2026-01-02T00:00:00.000Z');
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          readAt: expect.any(Date),
        }),
      );
    });

    it('throws ForbiddenException when inquiry belongs to a different artisan', async () => {
      const otherProfile = { ...mockProfileRow, id: 'different-artisan-id' };
      mockDb.limit.mockResolvedValueOnce([otherProfile]);
      mockDb.limit.mockResolvedValueOnce([mockInquiryRow]);

      await expect(
        service.updateInquiryStatus(otherProfile.userId, mockInquiryRow.id, {
          status: 'read',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when inquiry does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.updateInquiryStatus(mockProfileRow.userId, 'missing-inquiry', {
          status: 'read',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminVerifyArtisan', () => {
    it('sets verifiedAt when the artisan is not yet verified', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);
      const verified = { ...mockProfileRow, verifiedAt: new Date('2026-01-03') };
      mockDb.returning.mockResolvedValueOnce([verified]);

      const result = await service.adminVerifyArtisan(mockProfileRow.id);

      expect(result.verifiedAt).toBe('2026-01-03T00:00:00.000Z');
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          verifiedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('clears verifiedAt when the artisan is already verified (toggle)', async () => {
      const alreadyVerified = { ...mockProfileRow, verifiedAt: new Date('2026-01-02') };
      mockDb.limit.mockResolvedValueOnce([alreadyVerified]);
      const unverified = { ...mockProfileRow, verifiedAt: null };
      mockDb.returning.mockResolvedValueOnce([unverified]);

      const result = await service.adminVerifyArtisan(mockProfileRow.id);

      expect(result.verifiedAt).toBeNull();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          verifiedAt: null,
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('throws NotFoundException when artisan does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.adminVerifyArtisan('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminDeleteArtisan', () => {
    it('soft deletes the artisan profile', async () => {
      mockDb.limit.mockResolvedValueOnce([mockProfileRow]);

      await service.adminDeleteArtisan(mockProfileRow.id);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
    });

    it('throws NotFoundException when artisan does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.adminDeleteArtisan('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
