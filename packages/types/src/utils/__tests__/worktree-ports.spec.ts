import { describe, expect, it } from 'vitest';

import {
  detectWtcWorktreeIndex,
  resolveLocalServiceUrl,
  resolveWorktreePort,
} from '../worktree-ports';

describe('worktree port utilities', () => {
  it('detects the worktree index from the wtc gateway port', () => {
    expect(detectWtcWorktreeIndex({ GATEWAY_PORT: '28001' })).toBe(1);
  });

  it('derives app ports from the detected wtc worktree index', () => {
    expect(resolveWorktreePort(8080, undefined, { GATEWAY_PORT: '28001' })).toBe(28081);
    expect(resolveWorktreePort(8002, undefined, { POSTGRES_PORT: '25433' })).toBe(28003);
  });

  it('prefers an explicit port override when present', () => {
    expect(resolveWorktreePort(8001, '39001', { GATEWAY_PORT: '28001' })).toBe(39001);
  });

  it('treats default service ports as remappable when wtc is active', () => {
    expect(resolveWorktreePort(8002, '8002', { GATEWAY_PORT: '28001' })).toBe(28003);
  });

  it('falls back to the default port when the env is not worktree-scoped', () => {
    expect(resolveWorktreePort(8001, undefined, {})).toBe(8001);
  });

  it('builds localhost service URLs from worktree-derived ports', () => {
    expect(
      resolveLocalServiceUrl({
        defaultPort: 8002,
        env: { GATEWAY_PORT: '28001', MARKET_SERVICE_URL: 'http://localhost:8002' },
      }),
    ).toBe('http://localhost:28003');
  });

  it('treats default explicit service ports as remappable when building local URLs', () => {
    expect(
      resolveLocalServiceUrl({
        defaultPort: 8002,
        explicitPort: '8002',
        env: { GATEWAY_PORT: '28001' },
      }),
    ).toBe('http://localhost:28003');
  });

  it('keeps explicit service URLs when no local worktree override is active', () => {
    expect(
      resolveLocalServiceUrl({
        defaultPort: 8002,
        explicitUrl: 'https://market.internal',
        env: {},
      }),
    ).toBe('https://market.internal');
  });

  it('prefers an explicit service URL over a matching explicit port when no worktree remap exists', () => {
    expect(
      resolveLocalServiceUrl({
        defaultPort: 8002,
        explicitPort: '8002',
        explicitUrl: 'http://market:8002',
        env: {},
      }),
    ).toBe('http://market:8002');
  });
});
