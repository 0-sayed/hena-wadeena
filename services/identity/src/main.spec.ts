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

describe('identity bootstrap', () => {
  const originalPort = process.env.PORT;
  const originalIdentityPort = process.env.IDENTITY_PORT;

  beforeEach(() => {
    vi.resetModules();
    configureAppMock.mockClear();
    nestCreateMock.mockClear();
    delete process.env.PORT;
    delete process.env.IDENTITY_PORT;
  });

  afterEach(() => {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }

    if (originalIdentityPort === undefined) {
      delete process.env.IDENTITY_PORT;
    } else {
      process.env.IDENTITY_PORT = originalIdentityPort;
    }
  });

  it('uses PORT when IDENTITY_PORT is not defined', async () => {
    process.env.PORT = '39001';

    await import('./main');
    await vi.dynamicImportSettled();

    expect(configureAppMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        port: 39001,
        serviceName: 'Identity',
      }),
    );
  });
});
