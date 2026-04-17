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

describe('map bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalMapPort = process.env.MAP_PORT;

  beforeEach(() => {
    vi.resetModules();
    configureAppMock.mockClear();
    nestCreateMock.mockClear();
    delete process.env.PORT;
    delete process.env.MAP_PORT;
  });

  afterEach(() => {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }

    if (originalMapPort === undefined) {
      delete process.env.MAP_PORT;
    } else {
      process.env.MAP_PORT = originalMapPort;
    }
  });

  it('uses PORT when MAP_PORT is not defined', async () => {
    process.env.PORT = '39004';

    await import('./main');
    await vi.dynamicImportSettled();

    expect(configureAppMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        port: 39004,
        serviceName: 'Map',
      }),
    );
  });
});
