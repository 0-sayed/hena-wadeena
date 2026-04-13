import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('gateway routed flows', () => {
  const template = readFileSync(join(__dirname, 'nginx.conf.template'), 'utf8');

  it('routes wallet endpoints to the identity service', () => {
    expect(template).toMatch(/location ~ \^\/api\/v1\/wallet\(\?:\/\|\$\)/);
    expect(template).toContain('set $upstream_identity http://identity:8001;');
  });

  it('routes my guide and package endpoints to the guide-booking service', () => {
    expect(template).toMatch(
      /location ~ \^\/api\/v1\/my\/\(guide-profile\|packages\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_guide http://guide-booking:8003;');
  });

  it('routes guide review endpoints to the guide-booking service', () => {
    expect(template).toMatch(/location ~ \^\/api\/v1\/guide-reviews\(\?:\/\|\$\)/);
    expect(template).toContain('set $upstream_guide http://guide-booking:8003;');
  });

  it('routes listing inquiry endpoints to the market service', () => {
    expect(template).toMatch(
      /location ~ \^\/api\/v1\/\(listings\|market\|prices\|price-index\|business\|businesses\|commodities\|commodity-prices\|reviews\|opportunities\|investments\|listing-inquiries\|business-inquiries\|benefits\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_market http://market:8002;');
  });

  it('routes business inquiry endpoints to the market service', () => {
    expect(template).toMatch(
      /location ~ \^\/api\/v1\/\(listings\|market\|prices\|price-index\|business\|businesses\|commodities\|commodity-prices\|reviews\|opportunities\|investments\|listing-inquiries\|business-inquiries\|benefits\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_market http://market:8002;');
  });
});
