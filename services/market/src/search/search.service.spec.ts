import { DRIZZLE_CLIENT, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { createMockDb, createMockRedis } from '../shared/test-helpers';

import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    mockDb = createMockDb();
    mockRedis = createMockRedis();

    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: DRIZZLE_CLIENT, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns cached results when available', async () => {
    const cachedData = JSON.stringify({
      data: [
        {
          id: '1',
          type: 'listing',
          title: { ar: 'فندق', en: null },
          snippet: '',
          rank: 1,
          metadata: {},
        },
      ],
      hasMore: false,
      query: 'فندق',
    });
    mockRedis.get.mockResolvedValueOnce(cachedData);

    const result = await service.search({ q: 'فندق', limit: 20, offset: 0 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.type).toBe('listing');
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('generates deterministic cache keys', () => {
    const key1 = (service as any).cacheKey('فندق', 20, 0);
    const key2 = (service as any).cacheKey('فندق', 20, 0);
    expect(key1).toBe(key2);

    const key3 = (service as any).cacheKey('فندق', 10, 0);
    expect(key1).not.toBe(key3);
  });

  it('merges and sorts results by rank descending', () => {
    const merged = (service as any).mergeResults(
      [
        {
          id: '1',
          type: 'listing',
          title: { ar: 'a', en: null },
          snippet: '',
          rank: 0.5,
          metadata: {},
        },
      ],
      [
        {
          id: '2',
          type: 'opportunity',
          title: { ar: 'b', en: null },
          snippet: '',
          rank: 0.8,
          metadata: {},
        },
      ],
      [
        {
          id: '3',
          type: 'business',
          title: { ar: 'c', en: null },
          snippet: '',
          rank: 0.3,
          metadata: {},
        },
      ],
    );

    expect(merged[0]!.id).toBe('2');
    expect(merged[1]!.id).toBe('1');
    expect(merged[2]!.id).toBe('3');
  });
});
