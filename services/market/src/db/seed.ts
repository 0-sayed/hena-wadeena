import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getLayer, logSummary, point } from '../../../../scripts/seed/seed-utils.js';

import {
  businessDirectories,
  commodities as commoditiesTable,
  commodityPrices,
  investmentOpportunities,
  listings,
  reviews,
} from './schema/index.js';
import { showcaseBusinesses } from './seed-data/business-directories.js';
import { commodities as commodityData, generatePriceSnapshots } from './seed-data/commodities.js';
import { essentialInvestments, showcaseInvestments } from './seed-data/investments.js';
import { essentialListings, showcaseListings } from './seed-data/listings.js';
import { showcaseListingReviews } from './seed-data/reviews.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pgClient = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'market, public' },
});
const db = drizzle(pgClient);

async function main() {
  const layer = getLayer();

  // 1. Commodities — same for both layers
  const commodityResult = await db
    .insert(commoditiesTable)
    .values(
      commodityData.map((c) => ({
        id: c.id,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        category: c.category,
        unit: c.unit,
        sortOrder: c.sortOrder,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: commoditiesTable.id });

  // 2. Listings — essential always, showcase adds more
  const allListings =
    layer === 'showcase' ? [...essentialListings, ...showcaseListings] : essentialListings;

  const listingResult = await db
    .insert(listings)
    .values(
      allListings.map((l) => ({
        id: l.id,
        ownerId: l.ownerId,
        listingType: l.listingType,
        transaction: l.transaction,
        titleAr: l.titleAr,
        titleEn: l.titleEn,
        description: l.description,
        category: l.category,
        price: l.price,
        district: l.district,
        address: l.address,
        slug: l.slug,
        status: l.status,
        isVerified: l.isVerified,
        isPublished: l.isPublished,
        location: point(l.lat, l.lon),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: listings.id });

  // 3. Investment opportunities — essential always, showcase adds more
  const allInvestments =
    layer === 'showcase' ? [...essentialInvestments, ...showcaseInvestments] : essentialInvestments;

  const investmentResult = await db
    .insert(investmentOpportunities)
    .values(
      allInvestments.map((inv) => ({
        id: inv.id,
        ownerId: inv.ownerId,
        titleAr: inv.titleAr,
        titleEn: inv.titleEn,
        description: inv.description,
        sector: inv.sector,
        area: inv.area,
        minInvestment: inv.minInvestment,
        maxInvestment: inv.maxInvestment,
        expectedReturnPct: inv.expectedReturnPct,
        paybackPeriodYears: inv.paybackPeriodYears,
        incentives: inv.incentives,
        infrastructure: inv.infrastructure,
        contact: inv.contact,
        status: inv.status,
        isVerified: inv.isVerified,
        source: inv.source,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: investmentOpportunities.id });

  let businessCount = 0;
  let priceCount = 0;
  let reviewCount = 0;

  if (layer === 'showcase') {
    // 4. Business directories — showcase only
    const businessResult = await db
      .insert(businessDirectories)
      .values(
        showcaseBusinesses.map((biz) => ({
          id: biz.id,
          ownerId: biz.ownerId,
          nameAr: biz.nameAr,
          nameEn: biz.nameEn,
          category: biz.category,
          descriptionAr: biz.descriptionAr,
          district: biz.district,
          phone: biz.phone,
          status: biz.status,
          verificationStatus: biz.verificationStatus,
          location: point(biz.lat, biz.lon),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: businessDirectories.id });
    businessCount = businessResult.length;

    // 5. Commodity price snapshots — showcase only, skip if already seeded
    // (no unique constraint on commodity_prices; guard against duplicates on re-runs)
    const existingCount =
      (await db.select({ count: sql<number>`count(*)::int` }).from(commodityPrices)).at(0)?.count ??
      0;
    if (existingCount === 0) {
      const snapshots = generatePriceSnapshots();
      const BATCH = 100;
      for (let i = 0; i < snapshots.length; i += BATCH) {
        await db.insert(commodityPrices).values(snapshots.slice(i, i + BATCH));
      }
      priceCount = snapshots.length;
    } else {
      priceCount = existingCount;
    }

    // 6. Listing reviews — showcase only
    const reviewResult = await db
      .insert(reviews)
      .values(
        showcaseListingReviews.map((r) => ({
          id: r.id,
          listingId: r.listingId,
          reviewerId: r.reviewerId,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          isActive: r.isActive,
          isVerifiedVisit: r.isVerifiedVisit,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: reviews.id });
    reviewCount = reviewResult.length;
  }

  logSummary('market', layer, {
    commodities: commodityResult.length,
    listings: listingResult.length,
    investments: investmentResult.length,
    ...(layer === 'showcase' && {
      businesses: businessCount,
      priceSnapshots: priceCount,
      reviews: reviewCount,
    }),
  });
}

main()
  .catch((error: unknown) => {
    console.error('Market seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
