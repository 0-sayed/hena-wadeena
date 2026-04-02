import type { JwtPayload } from '@hena-wadeena/nest-common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateGuideDto, UpdateGuideDto } from './dto';
import { GuidesService } from './guides.service';
import { MyGuideController } from './my-guide.controller';

describe('MyGuideController', () => {
  let controller: MyGuideController;
  let mockGuidesService: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMyProfile: ReturnType<typeof vi.fn>;
  };

  const currentUser: JwtPayload = {
    sub: 'guide-user-1',
    email: 'guide@example.com',
    role: 'guide',
    lang: 'ar',
    jti: 'jti-1',
  };

  beforeEach(() => {
    mockGuidesService = {
      create: vi.fn().mockResolvedValue({ id: 'guide-1', userId: currentUser.sub }),
      update: vi.fn().mockResolvedValue({ id: 'guide-1', userId: currentUser.sub }),
      findMyProfile: vi.fn().mockResolvedValue({ id: 'guide-1', userId: currentUser.sub }),
    };

    controller = new MyGuideController(mockGuidesService as unknown as GuidesService);
  });

  it('declares the my/guide-profile controller path', () => {
    const create = Object.getOwnPropertyDescriptor(MyGuideController.prototype, 'create')?.value;

    expect(Reflect.getMetadata(PATH_METADATA, MyGuideController)).toBe('my/guide-profile');
    expect(Reflect.getMetadata(METHOD_METADATA, create)).toBe(RequestMethod.POST);
  });

  it('creates the current guide profile', async () => {
    const dto: CreateGuideDto = {
      licenseNumber: 'LIC-123',
      basePrice: 20000,
    };

    await controller.create(dto, currentUser);

    expect(mockGuidesService.create).toHaveBeenCalledWith(dto, currentUser.sub);
  });

  it('updates the current guide profile', async () => {
    const dto: UpdateGuideDto = {
      bioAr: 'مرشد سياحي',
    };

    await controller.update(dto, currentUser);

    expect(mockGuidesService.update).toHaveBeenCalledWith(currentUser.sub, dto);
  });

  it('returns the current guide profile', async () => {
    await controller.findMyProfile(currentUser);

    expect(mockGuidesService.findMyProfile).toHaveBeenCalledWith(currentUser.sub);
  });
});
