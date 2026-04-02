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
    expect(template).toMatch(/location ~ \^\/api\/v1\/my\/\(guide-profile\|packages\)\(\?:\/\|\$\)/);
    expect(template).toContain('set $upstream_guide http://guide-booking:8003;');
  });
});
