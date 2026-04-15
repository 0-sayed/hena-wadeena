import { describe, expect, it } from 'vitest';

import { buttonVariants } from './button';

describe('buttonVariants', () => {
  it('uses a tight line box so text aligns with centered icons', () => {
    expect(buttonVariants()).toContain('leading-none');
  });

  it('nudges icons down in rtl text to match Arabic glyph ink', () => {
    expect(buttonVariants()).toContain('rtl:[&_svg]:translate-y-0.5');
  });
});
