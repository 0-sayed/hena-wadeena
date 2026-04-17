import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configureAppMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const nestCreateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@hena-wadeena/nest-common', () => ({
  configureApp: configureAppMock,
}));

vi.mock('@nestjs/core', () => ({
  NestFactory: {
    create: nestCreateMock,
  },
}));

vi.mock('./app.module', () => ({
  AppModule: class AppModule {},
}));

describe('guide-booking bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalGuideBookingPort = process.env.GUIDE_BOOKING_PORT;

  beforeEach(() => {
    vi.resetModules();
    configureAppMock.mockClear();
    nestCreateMock.mockClear();
    delete process.env.PORT;
    delete process.env.GUIDE_BOOKING_PORT;
  });

  afterEach(() => {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }

    if (originalGuideBookingPort === undefined) {
      delete process.env.GUIDE_BOOKING_PORT;
    } else {
      process.env.GUIDE_BOOKING_PORT = originalGuideBookingPort;
    }
  });

  it('uses PORT when GUIDE_BOOKING_PORT is not defined', async () => {
    process.env.PORT = '39003';

    await import('./main');
    await vi.dynamicImportSettled();

    expect(configureAppMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        port: 39003,
        serviceName: 'GuideBooking',
      }),
    );
  });
});
