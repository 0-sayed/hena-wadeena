import { normalizeArabic, REDIS_CLIENT } from '@hena-wadeena/nest-common';
import type {
  SearchResult,
  SearchResultType,
  ServiceSearchResponse,
  UnifiedSearchResponse,
} from '@hena-wadeena/types';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { SearchService } from '../search/search.service';

import { EXTERNAL_SEARCH_SERVICES, type SearchServiceConfig } from './search-services.config';

const CACHE_TTL_SECONDS = 60;
const SEARCH_TIMEOUT_MS = Number(process.env.SEARCH_TIMEOUT_MS ?? 3000);

@Injectable()
export class UnifiedSearchService {
  private readonly logger = new Logger(UnifiedSearchService.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly httpService: HttpService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async search(params: {
    q: string;
    type?: string[];
    limit: number;
    offset: number;
  }): Promise<UnifiedSearchResponse> {
    const { q, type, limit, offset } = params;
    const normalizedQ = normalizeArabic(q);

    const cacheKey = `usearch:${normalizedQ}:${(type ?? ['all']).join(',')}:${limit}:${offset}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return { ...(JSON.parse(cached) as UnifiedSearchResponse), query: q };
    } catch (err: unknown) {
      this.logger.warn('Unified search cache read failed', err);
    }

    const requestedTypes = type as SearchResultType[] | undefined;
    const perServiceLimit = Math.max(limit * 2, offset + limit);
    const sources: string[] = [];
    const allResults: SearchResult[] = [];

    // Fan out to all matching services in parallel
    const queryIdentity = this.shouldQueryService(['user'], requestedTypes);
    const externalServices = EXTERNAL_SEARCH_SERVICES.filter((svc) =>
      this.shouldQueryService(svc.types, requestedTypes),
    );

    const [identityResult, ...externalResults] = await Promise.allSettled([
      queryIdentity
        ? this.searchService.search({ q: normalizedQ, limit: perServiceLimit, offset: 0 })
        : Promise.resolve(null),
      ...externalServices.map((svc) =>
        this.queryExternalService(svc, normalizedQ, perServiceLimit),
      ),
    ]);

    if (identityResult.status === 'fulfilled' && identityResult.value) {
      allResults.push(...identityResult.value.data);
      sources.push('identity');
    } else if (identityResult.status === 'rejected') {
      this.logger.warn('Identity search failed', identityResult.reason);
    }

    for (let i = 0; i < externalResults.length; i++) {
      const result = externalResults[i];
      const svc = externalServices[i];
      if (!result || !svc) continue;
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value.data);
        sources.push(svc.name);
      } else if (result.status === 'rejected') {
        this.logger.warn(`Search service ${svc.name} failed: ${String(result.reason)}`);
      }
    }

    // Sort by rank descending, apply pagination
    allResults.sort((a, b) => b.rank - a.rank);

    // Filter by requested types (post-merge, in case a service returned unexpected types)
    const filtered = requestedTypes
      ? allResults.filter((r) => requestedTypes.includes(r.type))
      : allResults;

    const paginated = filtered.slice(offset, offset + limit);
    const response: UnifiedSearchResponse = {
      data: paginated,
      hasMore: filtered.length > offset + limit,
      query: q,
      sources,
    };

    this.redis
      .set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS)
      .catch((err: unknown) => {
        this.logger.warn('Unified search cache set failed', err);
      });

    return response;
  }

  private shouldQueryService(
    serviceTypes: SearchResultType[],
    requestedTypes?: SearchResultType[],
  ): boolean {
    if (!requestedTypes) return true;
    return serviceTypes.some((t) => requestedTypes.includes(t));
  }

  private async queryExternalService(
    svc: SearchServiceConfig,
    normalizedQ: string,
    limit: number,
  ): Promise<ServiceSearchResponse | null> {
    const url = `${svc.url}/api/v1/internal/search`;
    const response = await firstValueFrom(
      this.httpService
        .get<ServiceSearchResponse>(url, {
          params: { q: normalizedQ, limit, offset: 0 },
          headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        })
        .pipe(
          timeout(SEARCH_TIMEOUT_MS),
          catchError((err) => {
            this.logger.warn(`External search ${svc.name} at ${url} failed: ${String(err)}`);
            return of(null);
          }),
        ),
    );

    return response?.data ?? null;
  }
}
