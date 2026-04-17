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

describe('market bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalMarketPort = process.env.MARKET_PORT;

  beforeEach(() => {
    vi.resetModules();
    configureAppMock.mockClear();
    nestCreateMock.mockClear();
    delete process.env.PORT;
    delete process.env.MARKET_PORT;
  });

  afterEach(() => {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }

    if (originalMarketPort === undefined) {
      delete process.env.MARKET_PORT;
    } else {
      process.env.MARKET_PORT = originalMarketPort;
    }
  });

  it('uses PORT when MARKET_PORT is not defined', async () => {
    process.env.PORT = '39002';

    await import('./main');
    await vi.dynamicImportSettled();

    expect(configureAppMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        port: 39002,
        serviceName: 'Market',
      }),
    );
  });
});
