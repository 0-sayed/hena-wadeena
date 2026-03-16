import {
  DRIZZLE_CLIENT,
  RedisStreamsService,
  S3Service,
  generateId,
} from '@hena-wadeena/nest-common';
import { EVENTS, PaginatedResponse, slugify } from '@hena-wadeena/types';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SQL, and, arrayContains, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getTableColumns } from 'drizzle-orm/utils';

import { listings } from '../db/schema/listings';

import { CreateListingDto } from './dto/create-listing.dto';
import { ImageUploadDto, NearbyQueryDto, QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

type Listing = typeof listings.$inferSelect;
type InsertListing = typeof listings.$inferInsert;

function paginate<T>(
  data: T[],
  total: number,
  offset: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    hasMore: offset + limit < total,
  };
}

const SORTABLE_FIELDS = {
  created_at: listings.createdAt,
  price: listings.price,
  rating_avg: listings.ratingAvg,
  views_count: listings.viewsCount,
} as const;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly s3: S3Service,
    private readonly redisStreams: RedisStreamsService,
  ) {}

  // --- Private helpers ---

  private buildFilters(query: QueryListingsDto): SQL {
    const conditions = [isNull(listings.deletedAt), eq(listings.status, 'active')];

    if (query.category)
      conditions.push(eq(listings.category, query.category as InsertListing['category']));
    if (query.sub_category) conditions.push(eq(listings.subCategory, query.sub_category));
    if (query.listing_type)
      conditions.push(eq(listings.listingType, query.listing_type as InsertListing['listingType']));
    if (query.transaction)
      conditions.push(eq(listings.transaction, query.transaction as InsertListing['transaction']));
    if (query.area) conditions.push(eq(listings.district, query.area));
    if (query.min_price !== undefined) conditions.push(gte(listings.price, query.min_price));
    if (query.max_price !== undefined) conditions.push(lte(listings.price, query.max_price));
    if (query.is_verified !== undefined)
      conditions.push(eq(listings.isVerified, query.is_verified));
    if (query.is_featured !== undefined)
      conditions.push(eq(listings.isFeatured, query.is_featured));
    if (query.min_rating !== undefined) conditions.push(gte(listings.ratingAvg, query.min_rating));
    if (query.tags) {
      const tagArray = query.tags.split(',').map((t) => t.trim());
      conditions.push(arrayContains(listings.tags, tagArray));
    }

    // Non-null assertion: always has at least 2 conditions (isNull + eq status)
    return and(...conditions)!;
  }

  private buildSort(sort?: string) {
    if (!sort) return desc(listings.createdAt);
    const [field, direction] = sort.split('|');
    const column = SORTABLE_FIELDS[field as keyof typeof SORTABLE_FIELDS];
    if (!column) return desc(listings.createdAt);
    return direction === 'asc' ? asc(column) : desc(column);
  }

  private async countListings(filters: SQL): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(filters);
    return count;
  }

  /** Raw find by id — ignores status, used for ownership checks */
  private async findRaw(id: string): Promise<Listing | null> {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .limit(1);
    return listing ?? null;
  }

  // --- Public methods ---

  async assertOwnership(listingId: string, callerId: string): Promise<Listing> {
    const listing = await this.findRaw(listingId);
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.ownerId !== callerId) throw new ForbiddenException('Not the listing owner');
    return listing;
  }

  async create(dto: CreateListingDto, ownerId: string): Promise<Listing> {
    const baseTitle = dto.titleEn ?? dto.titleAr;
    let slug = slugify(baseTitle);

    // Ensure slug uniqueness (excluding soft-deleted)
    const existing = await this.db
      .select({ slug: listings.slug })
      .from(listings)
      .where(and(eq(listings.slug, slug), isNull(listings.deletedAt)));
    if (existing.length > 0) {
      slug = `${slug}-${generateId().slice(0, 6)}`;
    }

    const id = generateId();
    const { location: locationInput, category, listingType, transaction, ...rest } = dto;

    const locationExpr = locationInput
      ? sql`public.ST_SetSRID(public.ST_MakePoint(${locationInput.lng}, ${locationInput.lat}), 4326)`
      : null;

    const [listing] = await this.db
      .insert(listings)
      .values({
        ...rest,
        category: category as InsertListing['category'],
        listingType: listingType as InsertListing['listingType'],
        transaction: transaction as InsertListing['transaction'],
        id,
        ownerId,
        slug,
        status: 'draft',
        location: locationExpr as unknown as InsertListing['location'],
      })
      .returning();

    this.redisStreams
      .publish(EVENTS.LISTING_CREATED, {
        listingId: listing.id,
        title: listing.titleAr,
        category: listing.category,
        area: listing.district ?? '',
      })
      .catch((err) => this.logger.error(`Failed to publish ${EVENTS.LISTING_CREATED}`, err));

    return listing;
  }

  async findById(id: string, callerId?: string): Promise<Listing | null> {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .limit(1);

    if (!listing) return null;
    // Owner sees all statuses; public sees only active
    if (listing.status !== 'active' && listing.ownerId !== callerId) return null;
    return listing;
  }

  async findBySlug(slug: string, callerId?: string): Promise<Listing | null> {
    const [listing] = await this.db
      .select()
      .from(listings)
      .where(and(eq(listings.slug, slug), isNull(listings.deletedAt)))
      .limit(1);

    if (!listing) return null;
    if (listing.status !== 'active' && listing.ownerId !== callerId) return null;
    return listing;
  }

  async findAll(query: QueryListingsDto): Promise<PaginatedResponse<Listing>> {
    const filters = this.buildFilters(query);
    const orderBy = this.buildSort(query.sort);

    const [results, total] = await Promise.all([
      this.db
        .select()
        .from(listings)
        .where(filters)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.countListings(filters),
    ]);

    return paginate(results, total, query.offset, query.limit);
  }

  async findFeatured(query: QueryListingsDto): Promise<PaginatedResponse<Listing>> {
    const filters = and(
      isNull(listings.deletedAt),
      eq(listings.status, 'active'),
      eq(listings.isFeatured, true),
    )!;

    const [results, total] = await Promise.all([
      this.db
        .select()
        .from(listings)
        .where(filters)
        .orderBy(desc(listings.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.countListings(filters),
    ]);

    return paginate(results, total, query.offset, query.limit);
  }

  async findNearby(
    query: NearbyQueryDto,
  ): Promise<PaginatedResponse<Listing & { distance_km: number }>> {
    const { lat, lng, radius_km, limit, offset } = query;
    const radiusM = radius_km * 1000;

    const nearbyFilters = and(
      isNull(listings.deletedAt),
      eq(listings.status, 'active'),
      sql`${listings.location} IS NOT NULL`,
      sql`public.ST_DWithin(${listings.location}::public.geography, public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)::public.geography, ${radiusM})`,
    )!;

    const distanceExpr = sql<number>`
      public.ST_Distance(
        ${listings.location}::public.geography,
        public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)::public.geography
      ) / 1000`;

    const [results, countResult] = await Promise.all([
      this.db
        .select({ ...getTableColumns(listings), distance_km: distanceExpr })
        .from(listings)
        .where(nearbyFilters)
        .orderBy(distanceExpr)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(nearbyFilters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(results, total, offset, limit);
  }

  async update(id: string, dto: UpdateListingDto): Promise<Listing> {
    const { location: locationInput, category, listingType, transaction, ...rest } = dto;

    const locationUpdate =
      locationInput !== undefined
        ? {
            location: (locationInput
              ? sql`public.ST_SetSRID(public.ST_MakePoint(${locationInput.lng}, ${locationInput.lat}), 4326)`
              : null) as unknown as InsertListing['location'],
          }
        : {};

    const enumFields = {
      ...(category !== undefined && { category: category as InsertListing['category'] }),
      ...(listingType !== undefined && {
        listingType: listingType as InsertListing['listingType'],
      }),
      ...(transaction !== undefined && {
        transaction: transaction as InsertListing['transaction'],
      }),
    };

    const [updated] = await this.db
      .update(listings)
      .set({
        ...rest,
        ...enumFields,
        updatedAt: new Date(),
        ...locationUpdate,
      })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException('Listing not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const [removed] = await this.db
      .update(listings)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    if (!removed) throw new NotFoundException('Listing not found');
  }

  async generateImageUploadUrl(
    id: string,
    dto: ImageUploadDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    const listing = await this.findRaw(id);
    if (!listing) throw new NotFoundException('Listing not found');

    const ext = dto.filename.split('.').pop() ?? 'jpg';
    const key = `market/listings/${id}/${generateId()}.${ext}`;

    const { uploadUrl } = await this.s3.getPresignedUploadUrl({
      key,
      contentType: dto.contentType,
      expiresIn: 300,
    });

    return { uploadUrl, key };
  }
}
