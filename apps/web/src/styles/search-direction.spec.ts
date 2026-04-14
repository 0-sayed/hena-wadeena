import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const indexCssPath = path.resolve(process.cwd(), 'src/index.css');
const indexCss = readFileSync(indexCssPath, 'utf8');

function cssRuleFor(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`).exec(indexCss);

  expect(match?.groups?.body).toBeDefined();

  return match?.groups?.body ?? '';
}

describe('search input direction utilities', () => {
  it('keeps the search icon and input padding on the inline start side', () => {
    expect(cssRuleFor("html[dir='rtl'] .search-inline-icon-lg")).toContain('right: 1rem;');
    expect(cssRuleFor("html[dir='rtl'] .search-input-with-icon-lg")).toContain(
      'padding-right: 3.5rem;',
    );
    expect(cssRuleFor("html[dir='rtl'] .search-inline-icon-md")).toContain('right: 0.75rem;');
    expect(cssRuleFor("html[dir='rtl'] .search-input-with-icon-md")).toContain(
      'padding-right: 3rem;',
    );

    expect(cssRuleFor("html[dir='ltr'] .search-inline-icon-lg")).toContain('left: 1rem;');
    expect(cssRuleFor("html[dir='ltr'] .search-input-with-icon-lg")).toContain(
      'padding-left: 3.5rem;',
    );
    expect(cssRuleFor("html[dir='ltr'] .search-inline-icon-md")).toContain('left: 0.75rem;');
    expect(cssRuleFor("html[dir='ltr'] .search-input-with-icon-md")).toContain(
      'padding-left: 3rem;',
    );
  });

  it('keeps end-side utilities available for search fields with inline-start buttons', () => {
    expect(cssRuleFor("html[dir='rtl'] .search-inline-icon-end-lg")).toContain('left: 1rem;');
    expect(cssRuleFor("html[dir='rtl'] .search-input-with-end-icon-lg")).toContain(
      'padding-left: 3.5rem;',
    );

    expect(cssRuleFor("html[dir='ltr'] .search-inline-icon-end-lg")).toContain('right: 1rem;');
    expect(cssRuleFor("html[dir='ltr'] .search-input-with-end-icon-lg")).toContain(
      'padding-right: 3.5rem;',
    );
  });
});
