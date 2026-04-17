import { DRIZZLE_CLIENT, generateId } from '@hena-wadeena/nest-common';
import type {
  ArtisanProduct,
  ArtisanProfile,
  ArtisanProfileWithProducts,
  PaginatedResponse,
  WholesaleInquiry,
} from '@hena-wadeena/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { artisanProducts } from '../db/schema/artisan-products';
import { artisanProfiles } from '../db/schema/artisan-profiles';
import { wholesaleInquiries } from '../db/schema/wholesale-inquiries';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import type {
  CreateArtisanProductDto,
  CreateArtisanProfileDto,
  CreateWholesaleInquiryDto,
  QueryArtisansDto,
  QueryProductsDto,
  UpdateArtisanProductDto,
  UpdateArtisanProfileDto,
  UpdateInquiryStatusDto,
} from './dto';
import { QrService } from './qr.service';

// ---------------------------------------------------------------------------
// Row → domain mappers
// ---------------------------------------------------------------------------

type ProfileRow = typeof artisanProfiles.$inferSelect;
type ProductRow = typeof artisanProducts.$inferSelect;
type InquiryRow = typeof wholesaleInquiries.$inferSelect;

function mapProfile(row: ProfileRow): ArtisanProfile {
  return {
    id: row.id,
    userId: row.userId,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? null,
    bioAr: row.bioAr ?? null,
    bioEn: row.bioEn ?? null,
    craftTypes: row.craftTypes,
    area: row.area,
    whatsapp: row.whatsapp,
    profileImageKey: row.profileImageKey ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapProduct(row: ProductRow): ArtisanProduct {
  return {
    id: row.id,
    artisanId: row.artisanId,
    nameAr: row.nameAr,
    nameEn: row.nameEn ?? null,
    descriptionAr: row.descriptionAr ?? null,
    descriptionEn: row.descriptionEn ?? null,
    craftType: row.craftType,
    price: row.price ?? null,
    minOrderQty: row.minOrderQty,
    imageKeys: row.imageKeys,
    qrCodeKey: row.qrCodeKey ?? null,
    available: row.available,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapInquiry(row: InquiryRow): WholesaleInquiry {
  return {
    id: row.id,
    productId: row.productId,
    artisanId: row.artisanId,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone,
    message: row.message ?? null,
    quantity: row.quantity ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ArtisansService {
  private readonly logger = new Logger(ArtisansService.name);

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase,
    private readonly qrService: QrService,
  ) {}

  // ---- Private helpers ----

  private async findProfileByUserId(userId: string): Promise<ProfileRow | null> {
    const [row] = await this.db
      .select()
      .from(artisanProfiles)
      .where(and(eq(artisanProfiles.userId, userId), isNull(artisanProfiles.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  private async findProfileById(id: string): Promise<ProfileRow | null> {
    const [row] = await this.db
      .select()
      .from(artisanProfiles)
      .where(and(eq(artisanProfiles.id, id), isNull(artisanProfiles.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  private async findPublicProfileById(id: string): Promise<ProfileRow | null> {
    const [row] = await this.db
      .select()
      .from(artisanProfiles)
      .where(
        and(
          eq(artisanProfiles.id, id),
          isNull(artisanProfiles.deletedAt),
          isNotNull(artisanProfiles.verifiedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async findProductById(productId: string): Promise<ProductRow | null> {
    const [row] = await this.db
      .select()
      .from(artisanProducts)
      .where(and(eq(artisanProducts.id, productId), isNull(artisanProducts.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  private async findPublicProductById(productId: string): Promise<ProductRow | null> {
    const [row] = await this.db
      .select()
      .from(artisanProducts)
      .where(
        and(
          eq(artisanProducts.id, productId),
          isNull(artisanProducts.deletedAt),
          eq(artisanProducts.available, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  // ---- Profile operations ----

  async listArtisans(query: QueryArtisansDto): Promise<PaginatedResponse<ArtisanProfile>> {
    const conditions = [isNull(artisanProfiles.deletedAt), isNotNull(artisanProfiles.verifiedAt)];

    if (query.area !== undefined) {
      conditions.push(eq(artisanProfiles.area, query.area));
    }
    if (query.craftType !== undefined) {
      conditions.push(sql`${query.craftType} = ANY(${artisanProfiles.craftTypes})`);
    }

    const filters = andRequired(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(artisanProfiles)
        .where(filters)
        .orderBy(desc(artisanProfiles.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(artisanProfiles)
        .where(filters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(rows.map(mapProfile), total, query.offset, query.limit);
  }

  async getArtisanById(id: string): Promise<ArtisanProfileWithProducts> {
    const [profileRow, productRows] = await Promise.all([
      this.findPublicProfileById(id),
      this.db
        .select()
        .from(artisanProducts)
        .where(
          andRequired(
            eq(artisanProducts.artisanId, id),
            isNull(artisanProducts.deletedAt),
            eq(artisanProducts.available, true),
          ),
        )
        .orderBy(desc(artisanProducts.createdAt)),
    ]);

    if (!profileRow) throw new NotFoundException('Artisan not found');

    return {
      ...mapProfile(profileRow),
      products: productRows.map(mapProduct),
    };
  }

  async getArtisanProducts(
    artisanId: string,
    query: QueryProductsDto,
  ): Promise<PaginatedResponse<ArtisanProduct>> {
    const profileRow = await this.findPublicProfileById(artisanId);
    if (!profileRow) throw new NotFoundException('Artisan not found');

    const conditions = [
      eq(artisanProducts.artisanId, artisanId),
      isNull(artisanProducts.deletedAt),
    ];

    if (query.craftType !== undefined) {
      conditions.push(eq(artisanProducts.craftType, query.craftType));
    }
    if (query.available !== undefined) {
      conditions.push(eq(artisanProducts.available, query.available));
    }

    const filters = andRequired(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(artisanProducts)
        .where(filters)
        .orderBy(desc(artisanProducts.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(artisanProducts)
        .where(filters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(rows.map(mapProduct), total, query.offset, query.limit);
  }

  async createProfile(userId: string, dto: CreateArtisanProfileDto): Promise<ArtisanProfile> {
    const existing = await this.findProfileByUserId(userId);
    if (existing) throw new ConflictException('Artisan profile already exists for this user');

    const now = new Date();
    const inserted = firstOrThrow(
      await this.db
        .insert(artisanProfiles)
        .values({
          id: generateId(),
          userId,
          nameAr: dto.nameAr,
          nameEn: dto.nameEn ?? null,
          bioAr: dto.bioAr ?? null,
          bioEn: dto.bioEn ?? null,
          craftTypes: dto.craftTypes,
          area: dto.area,
          whatsapp: dto.whatsapp,
          profileImageKey: dto.profileImageKey ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    );

    return mapProfile(inserted);
  }

  async getMyProfile(userId: string): Promise<ArtisanProfile> {
    const row = await this.findProfileByUserId(userId);
    if (!row) throw new NotFoundException('Artisan profile not found');
    return mapProfile(row);
  }

  async updateMyProfile(userId: string, dto: UpdateArtisanProfileDto): Promise<ArtisanProfile> {
    const existing = await this.findProfileByUserId(userId);
    if (!existing) throw new NotFoundException('Artisan profile not found');

    const setClause: Partial<typeof artisanProfiles.$inferInsert> = { updatedAt: new Date() };
    if (dto.nameAr !== undefined) setClause.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) setClause.nameEn = dto.nameEn ?? null;
    if (dto.bioAr !== undefined) setClause.bioAr = dto.bioAr ?? null;
    if (dto.bioEn !== undefined) setClause.bioEn = dto.bioEn ?? null;
    if (dto.craftTypes !== undefined) setClause.craftTypes = dto.craftTypes;
    if (dto.area !== undefined) setClause.area = dto.area;
    if (dto.whatsapp !== undefined) setClause.whatsapp = dto.whatsapp;
    if (dto.profileImageKey !== undefined) setClause.profileImageKey = dto.profileImageKey ?? null;

    const updated = firstOrThrow(
      await this.db
        .update(artisanProfiles)
        .set(setClause)
        .where(and(eq(artisanProfiles.id, existing.id), isNull(artisanProfiles.deletedAt)))
        .returning(),
    );

    return mapProfile(updated);
  }

  // ---- Product operations ----

  async getProductForPublic(
    productId: string,
  ): Promise<ArtisanProduct & { artisan: ArtisanProfile }> {
    const productRow = await this.findPublicProductById(productId);
    if (!productRow) throw new NotFoundException('Product not found');

    const profileRow = await this.findPublicProfileById(productRow.artisanId);
    if (!profileRow) throw new NotFoundException('Artisan not found');

    return {
      ...mapProduct(productRow),
      artisan: mapProfile(profileRow),
    };
  }

  async createProduct(userId: string, dto: CreateArtisanProductDto): Promise<ArtisanProduct> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Artisan profile not found');

    const id = generateId();
    const now = new Date();

    const inserted = firstOrThrow(
      await this.db
        .insert(artisanProducts)
        .values({
          id,
          artisanId: profile.id,
          nameAr: dto.nameAr,
          nameEn: dto.nameEn ?? null,
          descriptionAr: dto.descriptionAr ?? null,
          descriptionEn: dto.descriptionEn ?? null,
          craftType: dto.craftType,
          price: dto.price ?? null,
          minOrderQty: dto.minOrderQty,
          imageKeys: dto.imageKeys,
          available: dto.available,
          qrCodeKey: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    );

    let qrKey: string | null = null;

    try {
      qrKey = await this.qrService.generateAndUpload(id);
      const [withQr] = await this.db
        .update(artisanProducts)
        .set({ qrCodeKey: qrKey, updatedAt: new Date() })
        .where(and(eq(artisanProducts.id, id), isNull(artisanProducts.deletedAt)))
        .returning();

      return mapProduct(withQr ?? inserted);
    } catch (error) {
      if (qrKey) {
        try {
          await this.qrService.deleteByKey(qrKey);
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to clean up artisan product QR asset ${qrKey}: ${String(cleanupError)}`,
          );
        }
      }

      await this.db
        .update(artisanProducts)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(artisanProducts.id, id), isNull(artisanProducts.deletedAt)));
      throw error;
    }
  }

  async listMyProducts(
    userId: string,
    query: QueryProductsDto,
  ): Promise<PaginatedResponse<ArtisanProduct>> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Artisan profile not found');

    const conditions = [
      eq(artisanProducts.artisanId, profile.id),
      isNull(artisanProducts.deletedAt),
    ];

    if (query.craftType !== undefined) {
      conditions.push(eq(artisanProducts.craftType, query.craftType));
    }
    if (query.available !== undefined) {
      conditions.push(eq(artisanProducts.available, query.available));
    }

    const filters = andRequired(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(artisanProducts)
        .where(filters)
        .orderBy(desc(artisanProducts.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(artisanProducts)
        .where(filters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(rows.map(mapProduct), total, query.offset, query.limit);
  }

  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateArtisanProductDto,
  ): Promise<ArtisanProduct> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Artisan profile not found');

    const product = await this.findProductById(productId);
    if (!product) throw new NotFoundException('Product not found');
    if (product.artisanId !== profile.id) throw new ForbiddenException('Not the product owner');

    const setClause: Partial<typeof artisanProducts.$inferInsert> = { updatedAt: new Date() };
    if (dto.nameAr !== undefined) setClause.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) setClause.nameEn = dto.nameEn ?? null;
    if (dto.descriptionAr !== undefined) setClause.descriptionAr = dto.descriptionAr ?? null;
    if (dto.descriptionEn !== undefined) setClause.descriptionEn = dto.descriptionEn ?? null;
    if (dto.craftType !== undefined) setClause.craftType = dto.craftType;
    if (dto.price !== undefined) setClause.price = dto.price ?? null;
    if (dto.minOrderQty !== undefined) setClause.minOrderQty = dto.minOrderQty;
    if (dto.imageKeys !== undefined) setClause.imageKeys = dto.imageKeys;
    if (dto.available !== undefined) setClause.available = dto.available;

    const updated = firstOrThrow(
      await this.db
        .update(artisanProducts)
        .set(setClause)
        .where(and(eq(artisanProducts.id, productId), isNull(artisanProducts.deletedAt)))
        .returning(),
    );

    if (!updated.qrCodeKey) {
      let qrKey: string | null = null;

      try {
        qrKey = await this.qrService.generateAndUpload(updated.id);
        const [withQr] = await this.db
          .update(artisanProducts)
          .set({ qrCodeKey: qrKey, updatedAt: new Date() })
          .where(eq(artisanProducts.id, updated.id))
          .returning();
        return mapProduct(withQr ?? updated);
      } catch (error) {
        if (qrKey) {
          try {
            await this.qrService.deleteByKey(qrKey);
          } catch (cleanupError) {
            this.logger.warn(
              `Failed to clean up artisan product QR asset ${qrKey}: ${String(cleanupError)}`,
            );
          }
        }

        this.logger.warn(
          `Failed to refresh artisan product QR code for ${updated.id}: ${String(error)}`,
        );
        return mapProduct(updated);
      }
    }

    return mapProduct(updated);
  }

  async deleteProduct(userId: string, productId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Artisan profile not found');

    const product = await this.findProductById(productId);
    if (!product) throw new NotFoundException('Product not found');
    if (product.artisanId !== profile.id) throw new ForbiddenException('Not the product owner');

    await this.db
      .update(artisanProducts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(artisanProducts.id, productId), isNull(artisanProducts.deletedAt)));
  }

  // ---- Inquiry operations ----

  async submitInquiry(
    productId: string,
    dto: CreateWholesaleInquiryDto,
  ): Promise<WholesaleInquiry> {
    const product = await this.findPublicProductById(productId);
    if (!product) throw new NotFoundException('Product not found');
    if (dto.quantity != null && dto.quantity < product.minOrderQty) {
      throw new BadRequestException(
        `Quantity must be at least the minimum order quantity of ${product.minOrderQty}`,
      );
    }

    const profile = await this.findPublicProfileById(product.artisanId);
    if (!profile) throw new NotFoundException('Product not found');

    const inserted = firstOrThrow(
      await this.db
        .insert(wholesaleInquiries)
        .values({
          id: generateId(),
          productId,
          artisanId: profile.id,
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone,
          message: dto.message ?? null,
          quantity: dto.quantity ?? null,
          createdAt: new Date(),
        })
        .returning(),
    );

    return mapInquiry(inserted);
  }

  async listMyInquiries(userId: string): Promise<WholesaleInquiry[]> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Artisan profile not found');

    const rows = await this.db
      .select()
      .from(wholesaleInquiries)
      .where(eq(wholesaleInquiries.artisanId, profile.id))
      .orderBy(desc(wholesaleInquiries.createdAt));

    return rows.map(mapInquiry);
  }

  async updateInquiryStatus(
    userId: string,
    inquiryId: string,
    dto: UpdateInquiryStatusDto,
  ): Promise<WholesaleInquiry> {
    const profile = await this.findProfileByUserId(userId);
    if (!profile) throw new NotFoundException('Artisan profile not found');

    const [inquiry] = await this.db
      .select()
      .from(wholesaleInquiries)
      .where(eq(wholesaleInquiries.id, inquiryId))
      .limit(1);

    if (!inquiry) throw new NotFoundException('Inquiry not found');
    if (inquiry.artisanId !== profile.id) throw new ForbiddenException('Not your inquiry');

    const setClause: Partial<typeof wholesaleInquiries.$inferInsert> = {
      status: dto.status,
    };
    if (dto.status === 'read' && inquiry.readAt === null) {
      setClause.readAt = new Date();
    }

    const updated = firstOrThrow(
      await this.db
        .update(wholesaleInquiries)
        .set(setClause)
        .where(eq(wholesaleInquiries.id, inquiryId))
        .returning(),
    );

    return mapInquiry(updated);
  }

  // ---- Admin operations ----

  async adminListArtisans(query: QueryArtisansDto): Promise<PaginatedResponse<ArtisanProfile>> {
    const conditions = [isNull(artisanProfiles.deletedAt)];

    if (query.area !== undefined) {
      conditions.push(eq(artisanProfiles.area, query.area));
    }
    if (query.craftType !== undefined) {
      conditions.push(sql`${query.craftType} = ANY(${artisanProfiles.craftTypes})`);
    }

    const filters = andRequired(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(artisanProfiles)
        .where(filters)
        .orderBy(desc(artisanProfiles.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(artisanProfiles)
        .where(filters),
    ]);

    const total = countResult[0]?.count ?? 0;
    return paginate(rows.map(mapProfile), total, query.offset, query.limit);
  }

  async adminVerifyArtisan(id: string): Promise<ArtisanProfile> {
    const profile = await this.findProfileById(id);
    if (!profile) throw new NotFoundException('Artisan not found');

    if (profile.verifiedAt) {
      return mapProfile(profile);
    }

    const updated = firstOrThrow(
      await this.db
        .update(artisanProfiles)
        .set({ verifiedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(artisanProfiles.id, id), isNull(artisanProfiles.deletedAt)))
        .returning(),
    );

    return mapProfile(updated);
  }

  async adminDeleteArtisan(id: string): Promise<void> {
    const profile = await this.findProfileById(id);
    if (!profile) throw new NotFoundException('Artisan not found');

    await this.db
      .update(artisanProfiles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(artisanProfiles.id, id), isNull(artisanProfiles.deletedAt)));
  }
}
