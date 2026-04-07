import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getLayer, logSummary, point } from '../../../../scripts/seed/seed-utils.js';

import {
  businessCommodities,
  businessDirectories,
  commodities as commoditiesTable,
  commodityPrices,
  investmentApplications,
  investmentOpportunities,
  listingInquiries,
  listings,
  priceSnapshots,
  reviews,
} from './schema/index.js';
import { showcaseBusinessCommodities } from './seed-data/business-commodities.js';
import { showcaseBusinesses } from './seed-data/business-directories.js';
import { commodities as commodityData, generatePriceSnapshots } from './seed-data/commodities.js';
import { showcaseInvestmentApplications } from './seed-data/investment-applications.js';
import { essentialInvestments, showcaseInvestments } from './seed-data/investments.js';
import { showcaseListingInquiries } from './seed-data/listing-inquiries.js';
import { essentialListings, showcaseListings } from './seed-data/listings.js';
import { generatePriceSnapshotData } from './seed-data/price-snapshots.js';
import { showcaseListingReviews } from './seed-data/reviews.js';

// ── Real image URLs ──────────────────────────────────────────────────────────
type ImgPair = [string, string];

// Slug-specific overrides for key listings
const LISTING_SLUG_IMGS: Record<string, ImgPair> = {
  'shaqqa-mafrousha-kharga': ['/images/seed/7vYn0kIq4Kw.jpg', '/images/seed/AO6BYTEnlMo.jpg'],
  'mazraat-tumur-dakhla': ['/images/seed/aSzaYMxRWjE.jpg', '/images/seed/sl71uVi8xxM.jpg'],
  'mahal-tujari-souq-kharga': ['/images/seed/MB2eoqiNKiw.jpg', '/images/seed/xrnNNnq6djg.jpg'],
  'funduq-qasr-bagawat': ['/images/seed/VmFFbYAp7oA.jpg', '/images/seed/eXVWq4_vMDA.jpg'],
  'lodge-altarfa-sahrawi': ['/images/seed/eXVWq4_vMDA.jpg', '/images/seed/XaidrBZfEwU.jpg'],
};

// Category-based fallbacks for all other listings
const LISTING_CATEGORY_IMGS: Record<string, ImgPair> = {
  accommodation: ['/images/seed/VmFFbYAp7oA.jpg', '/images/seed/7vYn0kIq4Kw.jpg'],
  place: ['/images/seed/aSzaYMxRWjE.jpg', '/images/seed/sl71uVi8xxM.jpg'],
  service: ['/images/seed/MB2eoqiNKiw.jpg', '/images/seed/xrnNNnq6djg.jpg'],
  restaurant: ['/images/seed/MB2eoqiNKiw.jpg', '/images/seed/AO6BYTEnlMo.jpg'],
  activity: ['/images/seed/WGYGBTqfZSc.jpg', '/images/seed/1wZngiswH4M.jpg'],
  transport: ['/images/seed/IJmbu7B6f8o.jpg', '/images/seed/umfgtmwR__Y.jpg'],
  education: ['/images/seed/pvFtrzwuc6g.jpg', '/images/seed/umfgtmwR__Y.jpg'],
  healthcare: ['/images/seed/xrnNNnq6djg.jpg', '/images/seed/7vYn0kIq4Kw.jpg'],
  shopping: ['/images/seed/MB2eoqiNKiw.jpg', '/images/seed/xrnNNnq6djg.jpg'],
};

function getListingImages(slug: string, category: string): ImgPair {
  return (
    LISTING_SLUG_IMGS[slug] ??
    LISTING_CATEGORY_IMGS[category] ?? [
      `https://picsum.photos/seed/${slug}-1/800/600`,
      `https://picsum.photos/seed/${slug}-2/800/600`,
    ]
  );
}

// Sector-based images for investment opportunities
const INVESTMENT_SECTOR_IMGS: Record<string, ImgPair> = {
  industry: ['/images/seed/_EFvjSgbw1c.jpg', '/images/seed/_EFvjSgbw1c.jpg'],
  energy: ['/images/seed/E4XEBPEkgUs.jpg', '/images/seed/hp6Xj7LyZ1E.jpg'],
  agriculture: ['/images/seed/aSzaYMxRWjE.jpg', '/images/seed/sl71uVi8xxM.jpg'],
  tourism: ['/images/seed/VmFFbYAp7oA.jpg', '/images/seed/wiki-white-desert-1.jpg'],
  real_estate: ['/images/seed/eXVWq4_vMDA.jpg', '/images/seed/7vYn0kIq4Kw.jpg'],
  services: ['/images/seed/xrnNNnq6djg.jpg', '/images/seed/MB2eoqiNKiw.jpg'],
  technology: ['/images/seed/E4XEBPEkgUs.jpg', '/images/seed/hp6Xj7LyZ1E.jpg'],
};

function getInvestmentImages(sector: string, id: string): ImgPair {
  return (
    INVESTMENT_SECTOR_IMGS[sector] ?? [
      `https://picsum.photos/seed/${id.slice(-8)}-1/1200/800`,
      `https://picsum.photos/seed/${id.slice(-8)}-2/1200/800`,
    ]
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
        iconUrl: c.iconUrl,
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
        images: getListingImages(l.slug, l.category),
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
        location: point(inv.lat, inv.lon),
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
        images: getInvestmentImages(inv.sector, inv.id),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: investmentOpportunities.id });

  let businessCount = 0;
  let priceCount = 0;
  let reviewCount = 0;
  let bizCommodityCount = 0;
  let inquiryCount = 0;
  let applicationCount = 0;
  let priceSnapshotCount = 0;

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
          logoUrl: biz.logoUrl,
          status: biz.status,
          verificationStatus: biz.verificationStatus,
          location: point(biz.lat, biz.lon),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: businessDirectories.id });
    businessCount = businessResult.length;

    // 5. Commodity price snapshots — showcase only, idempotent via onConflictDoNothing
    const snapshots = generatePriceSnapshots();
    const BATCH = 100;
    for (let i = 0; i < snapshots.length; i += BATCH) {
      await db
        .insert(commodityPrices)
        .values(snapshots.slice(i, i + BATCH))
        .onConflictDoNothing();
    }
    priceCount = snapshots.length;

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

    // 7. Business commodities — showcase only
    const bizCommodityResult = await db
      .insert(businessCommodities)
      .values(showcaseBusinessCommodities)
      .onConflictDoNothing()
      .returning({ businessId: businessCommodities.businessId });
    bizCommodityCount = bizCommodityResult.length;

    // 8. Listing inquiries — showcase only
    const inquiryResult = await db
      .insert(listingInquiries)
      .values(
        showcaseListingInquiries.map((inq) => ({
          id: inq.id,
          listingId: inq.listingId,
          senderId: inq.senderId,
          receiverId: inq.receiverId,
          contactName: inq.contactName,
          contactEmail: inq.contactEmail,
          contactPhone: inq.contactPhone,
          message: inq.message,
          replyMessage: inq.replyMessage,
          status: inq.status,
          readAt: inq.readAt,
          respondedAt: inq.respondedAt,
          createdAt: inq.createdAt,
          updatedAt: inq.updatedAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: listingInquiries.id });
    inquiryCount = inquiryResult.length;

    // 9. Investment applications — showcase only
    const applicationResult = await db
      .insert(investmentApplications)
      .values(
        showcaseInvestmentApplications.map((app) => ({
          id: app.id,
          opportunityId: app.opportunityId,
          investorId: app.investorId,
          amountProposed: app.amountProposed,
          message: app.message,
          contactEmail: app.contactEmail,
          contactPhone: app.contactPhone,
          status: app.status,
          createdAt: app.createdAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: investmentApplications.id });
    applicationCount = applicationResult.length;

    // 10. Real-estate price snapshots — showcase only
    const psData = generatePriceSnapshotData();
    for (let i = 0; i < psData.length; i += BATCH) {
      await db
        .insert(priceSnapshots)
        .values(psData.slice(i, i + BATCH))
        .onConflictDoNothing();
    }
    priceSnapshotCount = psData.length;
  }

  logSummary('market', layer, {
    commodities: commodityResult.length,
    listings: listingResult.length,
    investments: investmentResult.length,
    ...(layer === 'showcase' && {
      businesses: businessCount,
      commodityPriceSnapshots: priceCount,
      reviews: reviewCount,
      bizCommodities: bizCommodityCount,
      inquiries: inquiryCount,
      applications: applicationCount,
      realEstatePriceSnapshots: priceSnapshotCount,
    }),
  });
}

main()
  .catch((error: unknown) => {
    console.error('Market seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
