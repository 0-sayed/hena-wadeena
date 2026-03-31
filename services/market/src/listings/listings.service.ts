import {
  DRIZZLE_CLIENT,
  RedisStreamsService,
  S3Service,
  andRequired,
  firstOrThrow,
  generateId,
  paginate,
} from '@hena-wadeena/nest-common';
import { EVENTS, slugify } from '@hena-wadeena/types';
import type { PaginatedResponse } from '@hena-wadeena/types';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SQL, and, arrayContains, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getTableColumns } from 'drizzle-orm/utils';

import type { FeatureListingDto } from '../admin/dto/feature-listing.dto';
import type { QueryAdminListingsDto } from '../admin/dto/query-admin-listings.dto';
import type { VerifyListingDto } from '../admin/dto/verify-listing.dto';
import { listings } from '../db/schema/listings';

// Exclude searchVector (tsvector generated column) from query results
const allColumns = getTableColumns(listings);
const listingColumns = Object.fromEntries(
  Object.entries(allColumns).filter(([key]) => key !== 'searchVector'),
) as Omit<typeof allColumns, 'searchVector'>;

import { CreateListingDto } from './dto/create-listing.dto';
import { ImageUploadDto, NearbyQueryDto, QueryListingsDto } from './dto/query-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

type Listing = Omit<typeof listings.$inferSelect, 'searchVector'>;
type InsertListing = typeof listings.$inferInsert;

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
    @Inject(S3Service) private readonly s3: S3Service,
    @Inject(RedisStreamsService) private readonly redisStreams: RedisStreamsService,
  ) {}

  // --- Private helpers ---

  private buildFilters(query: QueryListingsDto): SQL {
    const conditions: SQL[] = [isNull(listings.deletedAt), eq(listings.status, 'active')];

    const eqFilters = [
      [query.category, listings.category],
      [query.sub_category, listings.subCategory],
      [query.listing_type, listings.listingType],
      [query.transaction, listings.transaction],
      [query.area, listings.district],
      [query.is_verified, listings.isVerified],
      [query.is_featured, listings.isFeatured],
    ] as const;

    for (const [value, column] of eqFilters) {
      if (value !== undefined) conditions.push(eq(column, value as never));
    }

    if (query.min_price !== undefined) conditions.push(gte(listings.price, query.min_price));
    if (query.max_price !== undefined) conditions.push(lte(listings.price, query.max_price));
    if (query.min_rating !== undefined) conditions.push(gte(listings.ratingAvg, query.min_rating));

    if (query.tags) {
      conditions.push(
        arrayContains(
          listings.tags,
          query.tags.split(',').map((t) => t.trim()),
        ),
      );
    }

    return andRequired(...conditions);
  }

  private buildAdminFilters(query: QueryAdminListingsDto): SQL {
    const conditions: SQL[] = [isNull(listings.deletedAt)];

    if (query.status !== undefined) {
      conditions.push(eq(listings.status, query.status));
    }
    if (query.is_verified !== undefined) {
      conditions.push(eq(listings.isVerified, query.is_verified));
    }
    if (query.is_featured !== undefined) {
      conditions.push(eq(listings.isFeatured, query.is_featured));
    }
    if (query.owner_id !== undefined) {
      conditions.push(eq(listings.ownerId, query.owner_id));
    }

    return andRequired(...conditions);
  }

  private buildSort(sort?: string) {
    if (!sort) return desc(listings.createdAt);
    const [field, direction] = sort.split('|');
    if (!field || !(field in SORTABLE_FIELDS)) return desc(listings.createdAt);
    const column = SORTABLE_FIELDS[field as keyof typeof SORTABLE_FIELDS];
    return direction === 'asc' ? asc(column) : desc(column);
  }

  private async countListings(filters: SQL): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)
      .where(filters);
    return result[0]?.count ?? 0;
  }

  /** Raw find by id — ignores status, used for ownership checks */
  private async findRaw(id: string): Promise<Listing | null> {
    const [listing] = await this.db
      .select(listingColumns)
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

    const listing = firstOrThrow(
      await this.db
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
        .returning(),
    );

    this.redisStreams
      .publish(EVENTS.LISTING_CREATED, {
        listingId: listing.id,
        titleAr: listing.titleAr,
        titleEn: listing.titleEn ?? '',
        description: listing.description ?? '',
        category: listing.category,
        district: listing.district ?? '',
        ownerId: listing.ownerId,
        status: listing.status,
        createdAt: listing.createdAt.toISOString(),
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to publish ${EVENTS.LISTING_CREATED}`, err);
      });

    return listing;
  }

  async findById(id: string, callerId?: string): Promise<Listing | null> {
    const [listing] = await this.db
      .select(listingColumns)
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
      .select(listingColumns)
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
        .select(listingColumns)
        .from(listings)
        .where(filters)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.countListings(filters),
    ]);

    return paginate(results, total, query.offset, query.limit);
  }

  async findAllAdmin(query: QueryAdminListingsDto): Promise<PaginatedResponse<Listing>> {
    const filters = this.buildAdminFilters(query);
    const orderBy = this.buildSort(query.sort);

    const [results, total] = await Promise.all([
      this.db
        .select(listingColumns)
        .from(listings)
        .where(filters)
        .orderBy(orderBy)
        .limit(query.limit)
        .offset(query.offset),
      this.countListings(filters),
    ]);

    return paginate(results, total, query.offset, query.limit);
  }

  async verify(id: string, dto: VerifyListingDto, adminId: string): Promise<Listing> {
    if (dto.action === 'approve') {
      const now = new Date();
      const [updated] = await this.db
        .update(listings)
        .set({
          status: 'active',
          isVerified: true,
          approvedBy: adminId,
          approvedAt: now,
          updatedAt: now,
        })
        .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
        .returning();

      if (!updated) throw new NotFoundException('Listing not found');

      this.redisStreams
        .publish(EVENTS.LISTING_VERIFIED, {
          listingId: updated.id,
          titleAr: updated.titleAr,
          titleEn: updated.titleEn ?? '',
          category: updated.category,
          district: updated.district ?? '',
          ownerId: updated.ownerId,
          verifiedBy: adminId,
          verifiedAt: now.toISOString(),
        })
        .catch((err: unknown) => {
          this.logger.error(`Failed to publish ${EVENTS.LISTING_VERIFIED}`, err);
        });

      return updated;
    }

    // Reject action
    const [updated] = await this.db
      .update(listings)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException('Listing not found');
    return updated;
  }

  async setFeatured(id: string, dto: FeatureListingDto): Promise<Listing> {
    const [updated] = await this.db
      .update(listings)
      .set({
        isFeatured: dto.featured,
        featuredUntil: dto.featuredUntil ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException('Listing not found');
    return updated;
  }

  async findFeatured(query: QueryListingsDto): Promise<PaginatedResponse<Listing>> {
    const filters = andRequired(
      isNull(listings.deletedAt),
      eq(listings.status, 'active'),
      eq(listings.isFeatured, true),
    );

    const [results, total] = await Promise.all([
      this.db
        .select(listingColumns)
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

    const nearbyFilters = andRequired(
      isNull(listings.deletedAt),
      eq(listings.status, 'active'),
      sql`${listings.location} IS NOT NULL`,
      sql`public.ST_DWithin(${listings.location}::public.geography, public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)::public.geography, ${radiusM})`,
    );

    const distanceExpr = sql<number>`
      public.ST_Distance(
        ${listings.location}::public.geography,
        public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)::public.geography
      ) / 1000`;

    const [results, countResult] = await Promise.all([
      this.db
        .select({ ...listingColumns, distance_km: distanceExpr })
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

    const locationUpdate = locationInput
      ? {
          location:
            sql`public.ST_SetSRID(public.ST_MakePoint(${locationInput.lng}, ${locationInput.lat}), 4326)` as unknown as InsertListing['location'],
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
