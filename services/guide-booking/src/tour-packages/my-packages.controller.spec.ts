import type { JwtPayload } from '@hena-wadeena/nest-common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreatePackageDto } from './dto';
import { MyPackagesController } from './my-packages.controller';
import { TourPackagesService } from './tour-packages.service';

describe('MyPackagesController', () => {
  let controller: MyPackagesController;
  let mockTourPackagesService: {
    create: ReturnType<typeof vi.fn>;
    findMyPackages: ReturnType<typeof vi.fn>;
  };

  const currentUser: JwtPayload = {
    sub: 'guide-user-1',
    email: 'guide@example.com',
    role: 'guide',
    lang: 'ar',
    jti: 'jti-1',
  };

  beforeEach(() => {
    mockTourPackagesService = {
      create: vi.fn().mockResolvedValue({ id: 'package-1', titleAr: 'رحلة' }),
      findMyPackages: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    };

    controller = new MyPackagesController(
      mockTourPackagesService as unknown as TourPackagesService,
    );
  });

  it('declares the my/packages controller path', () => {
    const create = Object.getOwnPropertyDescriptor(MyPackagesController.prototype, 'create')?.value;

    expect(Reflect.getMetadata(PATH_METADATA, MyPackagesController)).toBe('my/packages');
    expect(Reflect.getMetadata(METHOD_METADATA, create)).toBe(RequestMethod.POST);
  });

  it('creates a package for the current guide', async () => {
    const dto: CreatePackageDto = {
      titleAr: 'رحلة سفاري',
      durationHours: 6,
      maxPeople: 4,
      price: 25000,
    };

    await controller.create(dto, currentUser);

    expect(mockTourPackagesService.create).toHaveBeenCalledWith(dto, currentUser.sub);
  });

  it('lists packages for the current guide', async () => {
    await controller.findMyPackages({ page: 1, limit: 20 }, currentUser);

    expect(mockTourPackagesService.findMyPackages).toHaveBeenCalledWith(
      currentUser.sub,
      undefined,
      1,
      20,
    );
  });
});
