import { REDIS_CLIENT } from '@hena-wadeena/nest-common';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { StatsService } from '../stats/stats.service';

import type { AdminStatsResponse } from './dto/admin-stats.dto';
import {
  ADMIN_SERVICES,
  ADMIN_STATS_CACHE_KEY,
  ADMIN_STATS_CACHE_TTL,
  SERVICE_TIMEOUT_MS,
} from './services.config';

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly localStatsService: StatsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getAggregatedStats(): Promise<AdminStatsResponse> {
    // Check cache first
    try {
      const cached = await this.redis.get(ADMIN_STATS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AdminStatsResponse;
        return parsed;
      }
    } catch (err) {
      this.logger.warn('Cache read failed', err);
    }

    // Fan out to all services in parallel
    const [identityResult, guideBookingResult, mapResult, localResult] = await Promise.allSettled([
      this.fetchServiceStats('identity'),
      this.fetchServiceStats('guide-booking'),
      this.fetchServiceStats('map'),
      this.localStatsService.getStats(),
    ]);

    const sources: string[] = [];
    let degraded = false;

    // Extract identity stats
    let identityStats = { users: undefined, kyc: undefined } as Record<string, unknown>;
    if (identityResult.status === 'fulfilled' && identityResult.value) {
      identityStats = identityResult.value;
      sources.push('identity');
    } else {
      degraded = true;
      this.logger.warn('Identity stats failed', identityResult);
    }

    // Extract guide-booking stats
    let guideBookingStats = {} as Record<string, unknown>;
    if (guideBookingResult.status === 'fulfilled' && guideBookingResult.value) {
      guideBookingStats = guideBookingResult.value;
      sources.push('guide-booking');
    } else {
      degraded = true;
      this.logger.warn('Guide-booking stats failed', guideBookingResult);
    }

    // Extract map stats
    let mapStats = {} as Record<string, unknown>;
    if (mapResult.status === 'fulfilled' && mapResult.value) {
      mapStats = mapResult.value;
      sources.push('map');
    } else {
      degraded = true;
      this.logger.warn('Map stats failed', mapResult);
    }

    // Local market stats — fully typed from StatsService
    let marketStatsData = null;
    if (localResult.status === 'fulfilled') {
      marketStatsData = localResult.value;
      sources.push('market');
    } else {
      degraded = true;
      this.logger.warn('Market stats failed', localResult);
    }

    const response: AdminStatsResponse = {
      users: (identityStats.users ?? {
        total: 0,
        byRole: {},
        byStatus: { active: 0, suspended: 0, banned: 0 },
        newLast30Days: 0,
      }) as AdminStatsResponse['users'],
      kyc: (identityStats.kyc ?? {
        total: 0,
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
      }) as AdminStatsResponse['kyc'],
      listings: marketStatsData?.listings ?? {
        total: 0,
        verified: 0,
        unverified: 0,
        featured: 0,
        byStatus: {},
      },
      investments: marketStatsData?.investments ?? {
        total: 0,
        verified: 0,
        byStatus: {},
        totalApplications: 0,
      },
      reviews: {
        listings: marketStatsData?.reviews ?? { total: 0, averageRating: 0 },
        guides: (guideBookingStats.reviews ?? { total: 0, averageRating: 0 }) as {
          total: number;
          averageRating: number;
        },
      },
      bookings: (guideBookingStats.bookings ?? {
        total: 0,
        pending: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      }) as AdminStatsResponse['bookings'],
      guides: (guideBookingStats.guides ?? {
        total: 0,
        verified: 0,
        active: 0,
      }) as AdminStatsResponse['guides'],
      packages: (guideBookingStats.packages ?? {
        total: 0,
        active: 0,
      }) as AdminStatsResponse['packages'],
      pois: (mapStats.pois ?? {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      }) as AdminStatsResponse['pois'],
      carpoolRides: (mapStats.carpoolRides ?? {
        total: 0,
        open: 0,
        full: 0,
        departed: 0,
        completed: 0,
        cancelled: 0,
      }) as AdminStatsResponse['carpoolRides'],
      meta: {
        sources,
        degraded,
        cachedAt: new Date().toISOString(),
      },
    };

    // Cache only if not degraded
    if (!degraded) {
      this.redis
        .set(ADMIN_STATS_CACHE_KEY, JSON.stringify(response), 'EX', ADMIN_STATS_CACHE_TTL)
        .catch((err) => {
          this.logger.warn('Cache write failed', err);
        });
    }

    return response;
  }

  private async fetchServiceStats(serviceName: string): Promise<Record<string, unknown> | null> {
    const config = ADMIN_SERVICES.find((s) => s.name === serviceName);
    if (!config) return null;

    const url = `${config.url}${config.statsPath}`;
    const response = await firstValueFrom(
      this.httpService
        .get<Record<string, unknown>>(url, {
          headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        })
        .pipe(
          timeout(SERVICE_TIMEOUT_MS),
          catchError((err) => {
            this.logger.warn(`Stats fetch from ${serviceName} at ${url} failed: ${String(err)}`);
            return of(null);
          }),
        ),
    );

    return response?.data ?? null;
  }
}
