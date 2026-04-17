import { describe, expect, it } from 'vitest';

import {
  createArtisanProductSchema,
  createArtisanProfileSchema,
  queryProductsSchema,
} from './artisan.schema';

describe('queryProductsSchema', () => {
  it('parses "true" and "false" into booleans', () => {
    const trueResult = queryProductsSchema.safeParse({ available: 'true' });
    const falseResult = queryProductsSchema.safeParse({ available: 'false' });

    expect(trueResult.success).toBe(true);
    expect(trueResult.data?.available).toBe(true);
    expect(falseResult.success).toBe(true);
    expect(falseResult.data?.available).toBe(false);
  });

  it('rejects invalid available values instead of coercing them to false', () => {
    const result = queryProductsSchema.safeParse({ available: 'abc' });

    expect(result.success).toBe(false);
  });
});

describe('media key validation', () => {
  it('rejects empty product image keys', () => {
    const result = createArtisanProductSchema.safeParse({
      nameAr: 'سلة خوص',
      craftType: 'basketry',
      imageKeys: ['valid/key.webp', ''],
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty profile image keys', () => {
    const result = createArtisanProfileSchema.safeParse({
      nameAr: 'حرفي',
      craftTypes: ['basketry'],
      area: 'kharga',
      whatsapp: '+201234567890',
      profileImageKey: '   ',
    });

    expect(result.success).toBe(false);
  });
});
