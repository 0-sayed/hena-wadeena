import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('gateway routed flows', () => {
  const template = readFileSync(join(__dirname, 'nginx.conf.template'), 'utf8');

  function routedServiceFor(path: string): string | undefined {
    const lines = template.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index]?.match(/^\s{4}location ~ (.+?) \{$/);
      if (!match) continue;

      const [, pattern] = match;
      const block: string[] = [];
      let depth = 0;

      do {
        const line = lines[index] ?? '';
        block.push(line);
        depth += (line.match(/\{/g) ?? []).length;
        depth -= (line.match(/\}/g) ?? []).length;
        index += 1;
      } while (index < lines.length && depth > 0);

      if (!new RegExp(pattern).test(path)) continue;

      const blockText = block.join('\n');
      if (blockText.includes('return 403;')) return 'blocked';

      return /set \$upstream_\w+ http:\/\/([^:]+):\d+;/.exec(blockText)?.[1];
    }

    return undefined;
  }

  it.each([
    ['/api/v1/auth/login', 'identity'],
    ['/api/v1/users/public', 'identity'],
    ['/api/v1/users/kyc', 'identity'],
    ['/api/v1/notifications', 'identity'],
    ['/api/v1/wallet', 'identity'],
    ['/api/v1/search', 'identity'],
    ['/api/v1/admin/users', 'identity'],
    ['/api/v1/admin/kyc', 'identity'],
    ['/api/v1/listings', 'market'],
    ['/api/v1/listings/00000000-0000-0000-0000-000000000000/inquiries', 'market'],
    ['/api/v1/businesses', 'market'],
    ['/api/v1/businesses/00000000-0000-0000-0000-000000000000/inquiries', 'market'],
    ['/api/v1/commodities', 'market'],
    ['/api/v1/commodity-prices', 'market'],
    ['/api/v1/price-index', 'market'],
    ['/api/v1/reviews', 'market'],
    ['/api/v1/investments', 'market'],
    ['/api/v1/listing-inquiries/mine/received', 'market'],
    ['/api/v1/business-inquiries/mine/received', 'market'],
    ['/api/v1/benefits', 'market'],
    ['/api/v1/jobs', 'market'],
    ['/api/v1/users/00000000-0000-0000-0000-000000000000/job-reviews', 'market'],
    ['/api/v1/news', 'market'],
    ['/api/v1/well-logs', 'market'],
    ['/api/v1/price-alerts', 'market'],
    ['/api/v1/admin/stats', 'market'],
    ['/api/v1/admin/market-stats', 'market'],
    ['/api/v1/admin/market-moderation/queue', 'market'],
    ['/api/v1/admin/moderation/queue', 'market'],
    ['/api/v1/admin/listings', 'market'],
    ['/api/v1/admin/news', 'market'],
    ['/api/v1/admin/well-logs', 'market'],
    ['/api/v1/admin/investment/interests', 'market'],
    ['/api/v1/admin/investments/00000000-0000-0000-0000-000000000000/approve', 'market'],
    ['/api/v1/my/guide-profile', 'guide-booking'],
    ['/api/v1/my/packages', 'guide-booking'],
    ['/api/v1/guides', 'guide-booking'],
    ['/api/v1/packages', 'guide-booking'],
    ['/api/v1/bookings', 'guide-booking'],
    ['/api/v1/bookings/00000000-0000-0000-0000-000000000000/desert-trip/check-in', 'guide-booking'],
    ['/api/v1/attractions', 'guide-booking'],
    ['/api/v1/guide-reviews', 'guide-booking'],
    ['/api/v1/admin/guides', 'guide-booking'],
    ['/api/v1/admin/bookings', 'guide-booking'],
    ['/api/v1/admin/packages', 'guide-booking'],
    ['/api/v1/admin/attractions', 'guide-booking'],
    ['/api/v1/map/pois', 'map'],
    ['/api/v1/map/admin/pois', 'map'],
    ['/api/v1/map/sites/status-board', 'map'],
    ['/api/v1/carpool', 'map'],
    ['/api/v1/chat/sessions', 'ai'],
    ['/api/v1/ai/chat', 'ai'],
    ['/api/v1/documents', 'ai'],
    ['/api/v1/internal/search', 'blocked'],
  ])('routes %s to %s', (path, service) => {
    expect(routedServiceFor(path)).toBe(service);
  });

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
      /location ~ \^\/api\/v1\/\(listings\|market\|prices\|price-index\|business\|businesses\|commodities\|commodity-prices\|reviews\|opportunities\|investments\|listing-inquiries\|business-inquiries\|benefits\|jobs\|news\|well-logs\|price-alerts\|artisans\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_market http://market:8002;');
  });

  it('routes business inquiry endpoints to the market service', () => {
    expect(template).toMatch(
      /location ~ \^\/api\/v1\/\(listings\|market\|prices\|price-index\|business\|businesses\|commodities\|commodity-prices\|reviews\|opportunities\|investments\|listing-inquiries\|business-inquiries\|benefits\|jobs\|news\|well-logs\|price-alerts\|artisans\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_market http://market:8002;');
  });

  it('routes all market admin endpoint groups to the market service', () => {
    expect(template).toMatch(
      /location ~ \^\/api\/v1\/admin\/\(stats\|market-stats\|market-moderation\|moderation\|listings\|news\|well-logs\|investment\|investments\|artisans\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_market http://market:8002;');
  });

  it('routes all guide-booking admin endpoint groups to the guide-booking service', () => {
    expect(template).toMatch(
      /location ~ \^\/api\/v1\/admin\/\(guides\|bookings\|packages\|attractions\)\(\?:\/\|\$\)/,
    );
    expect(template).toContain('set $upstream_guide http://guide-booking:8003;');
  });
});
