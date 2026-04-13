import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewsService } from '../reviews/reviews.service';

import type { CreateListingDto } from './dto/create-listing.dto';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

describe('ListingsController', () => {
  let controller: ListingsController;
  let listingsService: {
    create: ReturnType<typeof vi.fn>;
    assertOwnership: ReturnType<typeof vi.fn>;
  };

  const merchantUser: JwtPayload = {
    sub: 'merchant-uuid-001',
    email: 'merchant@example.com',
    role: UserRole.MERCHANT,
  };

  const adminUser: JwtPayload = {
    sub: 'admin-uuid-001',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const createDto: CreateListingDto = {
    titleAr: 'تمور سيوي',
    listingType: 'business',
    transaction: 'sale',
    category: 'shopping',
    price: 5000,
    priceUnit: 'piece',
  };

  beforeEach(() => {
    listingsService = {
      create: vi.fn().mockResolvedValue({ id: 'listing-1' }),
      assertOwnership: vi.fn().mockResolvedValue(undefined),
    };

    controller = new ListingsController(
      listingsService as unknown as ListingsService,
      {} as unknown as ReviewsService,
    );
  });

  describe('create', () => {
    it('passes isAdmin=false when a merchant creates a listing', async () => {
      await controller.create(createDto, merchantUser);

      expect(listingsService.create).toHaveBeenCalledWith(createDto, merchantUser.sub, false);
    });

    it('passes isAdmin=true when an admin creates a listing', async () => {
      await controller.create(createDto, adminUser);

      expect(listingsService.create).toHaveBeenCalledWith(createDto, adminUser.sub, true);
    });
  });
});
