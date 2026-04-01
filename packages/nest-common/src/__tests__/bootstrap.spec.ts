import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureApp } from '../bootstrap';

const ORIGINAL_REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT;

interface MockNestApp {
  use: ReturnType<typeof vi.fn>;
  getHttpAdapter: ReturnType<typeof vi.fn>;
  setGlobalPrefix: ReturnType<typeof vi.fn>;
  enableShutdownHooks: ReturnType<typeof vi.fn>;
  listen: ReturnType<typeof vi.fn>;
  useBodyParser: ReturnType<typeof vi.fn>;
}

describe('configureApp', () => {
  let adapterSet: ReturnType<typeof vi.fn>;
  let app: MockNestApp;

  beforeEach(() => {
    delete process.env.REQUEST_BODY_LIMIT;

    adapterSet = vi.fn();
    app = {
      use: vi.fn(),
      useBodyParser: vi.fn(),
      getHttpAdapter: vi.fn(() => ({
        getInstance: () => ({
          set: adapterSet,
        }),
      })),
      setGlobalPrefix: vi.fn(),
      enableShutdownHooks: vi.fn(),
      listen: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    if (ORIGINAL_REQUEST_BODY_LIMIT === undefined) {
      delete process.env.REQUEST_BODY_LIMIT;
      return;
    }

    process.env.REQUEST_BODY_LIMIT = ORIGINAL_REQUEST_BODY_LIMIT;
  });

  it('configures generous body parser limits for JSON and urlencoded payloads', async () => {
    await configureApp(app, { port: 8001, serviceName: 'Identity' });

    expect(app.useBodyParser).toHaveBeenCalledWith('json', { limit: '10mb' });
    expect(app.useBodyParser).toHaveBeenCalledWith('urlencoded', {
      extended: true,
      limit: '10mb',
    });
  });
});
