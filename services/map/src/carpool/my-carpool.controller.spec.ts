import { UserRole } from '@hena-wadeena/types';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@hena-wadeena/nest-common';

import { MyCarpoolController } from './my-carpool.controller';
import { CarpoolService } from './carpool.service';

describe('MyCarpoolController', () => {
  let controller: MyCarpoolController;
  let mockCarpoolService: {
    createRide: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCarpoolService = {
      createRide: vi.fn().mockResolvedValue({ id: 'ride-1' }),
    };

    controller = new MyCarpoolController(mockCarpoolService as unknown as CarpoolService);
  });

  it('requires driver or admin role for ride creation', () => {
    const createRide = Object.getOwnPropertyDescriptor(
      MyCarpoolController.prototype,
      'createRide',
    )?.value;

    expect(Reflect.getMetadata(METHOD_METADATA, createRide)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(ROLES_KEY, createRide)).toEqual([
      UserRole.DRIVER,
      UserRole.ADMIN,
    ]);
  });

  it('creates a ride for the current user', async () => {
    const dto = {
      origin: { lat: 25.44, lng: 30.55 },
      destination: { lat: 25.49, lng: 28.98 },
      originName: 'الخارجة',
      destinationName: 'الداخلة',
      departureTime: new Date('2026-04-02T10:00:00.000Z'),
      seatsTotal: 4,
      pricePerSeat: 25000,
    };
    const user = {
      sub: 'driver-1',
      email: 'driver@example.com',
      role: UserRole.DRIVER,
      lang: 'ar' as const,
      jti: 'jti-1',
    };

    await controller.createRide(dto, user);

    expect(mockCarpoolService.createRide).toHaveBeenCalledWith(dto, user.sub);
  });
});
