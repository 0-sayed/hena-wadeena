import { DRIZZLE_CLIENT } from '@hena-wadeena/nest-common';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';

import { investmentOpportunities } from '../db/schema/investment-opportunities';
import { listings } from '../db/schema/listings';

import type {
  ModerationItem,
  ModerationQueryDto,
  ModerationQueueResponse,
} from './dto/moderation-query.dto';
import { ADMIN_SERVICES, SERVICE_TIMEOUT_MS } from './services.config';

@Injectable()
export class AdminModerationService {
  private readonly logger = new Logger(AdminModerationService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
  ) {}

  async getQueue(query: ModerationQueryDto): Promise<ModerationQueueResponse> {
    const requestedTypes = query.type;

    // Gather items from all sources in parallel
    const [localItems, identityItems, mapItems] = await Promise.all([
      this.getLocalPendingItems(requestedTypes),
      this.fetchExternalModeration('identity', requestedTypes),
      this.fetchExternalModeration('map', requestedTypes),
    ]);

    // Merge and sort by createdAt desc
    const allItems = [...localItems, ...identityItems, ...mapItems];
    allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter by type if requested
    const filtered = requestedTypes
      ? allItems.filter((item) => requestedTypes.includes(item.type))
      : allItems;

    // Paginate
    const paginated = filtered.slice(query.offset, query.offset + query.limit);

    return {
      data: paginated,
      total: filtered.length,
      page: Math.floor(query.offset / query.limit) + 1,
      limit: query.limit,
      hasMore: filtered.length > query.offset + query.limit,
    };
  }

  private async getLocalPendingItems(types?: string[]): Promise<ModerationItem[]> {
    const items: ModerationItem[] = [];

    // Unverified listings
    if (!types || types.includes('listing')) {
      const pendingListings = await this.db
        .select({
          id: listings.id,
          title: listings.titleAr,
          description: listings.description,
          status: listings.status,
          ownerId: listings.ownerId,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(
          sql`${listings.isVerified} = false AND ${listings.deletedAt} IS NULL AND ${listings.status} = 'active'`,
        )
        .orderBy(listings.createdAt);

      for (const listing of pendingListings) {
        items.push({
          id: listing.id,
          type: 'listing',
          title: listing.title,
          description: listing.description,
          status: 'unverified',
          createdAt: listing.createdAt,
          createdBy: { id: listing.ownerId, name: null, email: null },
          service: 'market',
          actions: {
            approve: `PATCH /api/v1/admin/listings/${listing.id}/verify`,
            reject: `PATCH /api/v1/admin/listings/${listing.id}/reject`,
            view: `GET /api/v1/listings/${listing.id}`,
          },
        });
      }
    }

    // Investment opportunities in review
    if (!types || types.includes('investment')) {
      const pendingInvestments = await this.db
        .select({
          id: investmentOpportunities.id,
          title: investmentOpportunities.titleAr,
          description: investmentOpportunities.description,
          status: investmentOpportunities.status,
          ownerId: investmentOpportunities.ownerId,
          createdAt: investmentOpportunities.createdAt,
        })
        .from(investmentOpportunities)
        .where(eq(investmentOpportunities.status, 'review'))
        .orderBy(investmentOpportunities.createdAt);

      for (const inv of pendingInvestments) {
        items.push({
          id: inv.id,
          type: 'investment',
          title: inv.title,
          description: inv.description,
          status: inv.status,
          createdAt: inv.createdAt,
          createdBy: { id: inv.ownerId, name: null, email: null },
          service: 'market',
          actions: {
            approve: `PATCH /api/v1/admin/investments/${inv.id}/approve`,
            reject: `PATCH /api/v1/admin/investments/${inv.id}/reject`,
            view: `GET /api/v1/investments/${inv.id}`,
          },
        });
      }
    }

    return items;
  }

  private async fetchExternalModeration(
    serviceName: string,
    types?: string[],
  ): Promise<ModerationItem[]> {
    const config = ADMIN_SERVICES.find((s) => s.name === serviceName);
    if (!config?.moderationPath) return [];

    // Check if requested types include this service's types
    const serviceTypes = serviceName === 'identity' ? ['kyc'] : ['poi'];
    if (types && !serviceTypes.some((t) => types.includes(t))) {
      return [];
    }

    const url = `${config.url}${config.moderationPath}`;
    const response = await firstValueFrom(
      this.httpService
        .get<{ data: Record<string, unknown>[] }>(url, {
          headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
        })
        .pipe(
          timeout(SERVICE_TIMEOUT_MS),
          catchError((err) => {
            this.logger.warn(`Moderation fetch from ${serviceName} failed: ${String(err)}`);
            return of(null);
          }),
        ),
    );

    const items = response?.data.data;
    if (!items) return [];

    return items.map((item) => ({
      id: item.id as string,
      type: item.type as ModerationItem['type'],
      title: item.title as string,
      description: item.description as string | null,
      status: item.status as string,
      createdAt: new Date(item.createdAt as string),
      createdBy: item.createdBy as ModerationItem['createdBy'],
      service: serviceName as ModerationItem['service'],
      actions: this.getActionsForType(item.type as string, item.id as string),
    }));
  }

  private getActionsForType(type: string, id: string): ModerationItem['actions'] {
    switch (type) {
      case 'kyc':
        return {
          approve: `PATCH /api/v1/admin/kyc/${id}`,
          reject: `PATCH /api/v1/admin/kyc/${id}`,
          view: `GET /api/v1/admin/kyc/${id}`,
        };
      case 'poi':
        return {
          approve: `PATCH /api/v1/map/pois/${id}/approve`,
          reject: `PATCH /api/v1/map/pois/${id}/reject`,
          view: `GET /api/v1/map/pois/${id}`,
        };
      default:
        return { approve: '', reject: '', view: '' };
    }
  }
}
