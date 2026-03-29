import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getLayer, logSummary, point } from '../../../../scripts/seed/seed-utils.js';

import { attractions, bookings, guideReviews, guides, tourPackages } from './schema/index.js';
import { essentialAttractions, showcaseAttractions } from './seed-data/attractions.js';
import { showcaseBookings } from './seed-data/bookings.js';
import { essentialGuides, showcaseGuides } from './seed-data/guides.js';
import { essentialPackages, showcasePackages } from './seed-data/packages.js';
import { showcaseGuideReviews } from './seed-data/reviews.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const pgClient = postgres(connectionString, {
  max: 1,
  connection: { search_path: 'guide_booking, public' },
});
const db = drizzle(pgClient);

async function main() {
  const layer = getLayer();

  // 1. Attractions — essential always, showcase adds more
  const allAttractions =
    layer === 'showcase' ? [...essentialAttractions, ...showcaseAttractions] : essentialAttractions;

  const attractionResult = await db
    .insert(attractions)
    .values(
      allAttractions.map((a) => ({
        id: a.id,
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        slug: a.slug,
        type: a.type,
        area: a.area,
        descriptionAr: a.descriptionAr,
        descriptionEn: a.descriptionEn,
        historyAr: a.historyAr,
        bestSeason: a.bestSeason,
        bestTimeOfDay: a.bestTimeOfDay,
        entryFee: a.entryFee,
        openingHours: a.openingHours,
        durationHours: a.durationHours,
        difficulty: a.difficulty,
        tips: a.tips,
        nearbySlugs: a.nearbySlugs,
        isActive: a.isActive,
        isFeatured: a.isFeatured,
        location: point(a.lat, a.lon),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: attractions.id });

  // 2. Guides — essential always, showcase adds more
  const allGuides =
    layer === 'showcase' ? [...essentialGuides, ...showcaseGuides] : essentialGuides;

  const guideResult = await db
    .insert(guides)
    .values(
      allGuides.map((g) => ({
        id: g.id,
        userId: g.userId,
        bioAr: g.bioAr,
        bioEn: g.bioEn,
        languages: g.languages,
        specialties: g.specialties,
        areasOfOperation: g.areasOfOperation,
        licenseNumber: g.licenseNumber,
        licenseVerified: g.licenseVerified,
        basePrice: g.basePrice,
        active: g.active,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: guides.id });

  // 3. Tour packages — essential always, showcase adds more
  const allPackages =
    layer === 'showcase' ? [...essentialPackages, ...showcasePackages] : essentialPackages;

  const packageResult = await db
    .insert(tourPackages)
    .values(
      allPackages.map((p) => ({
        id: p.id,
        guideId: p.guideId,
        titleAr: p.titleAr,
        titleEn: p.titleEn,
        description: p.description,
        durationHours: p.durationHours,
        maxPeople: p.maxPeople,
        price: p.price,
        includes: p.includes,
        status: p.status,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: tourPackages.id });

  let bookingCount = 0;
  let reviewCount = 0;

  if (layer === 'showcase') {
    // 4. Bookings — showcase only
    const bookingResult = await db
      .insert(bookings)
      .values(
        showcaseBookings.map((b) => ({
          id: b.id,
          packageId: b.packageId,
          guideId: b.guideId,
          touristId: b.touristId,
          bookingDate: b.bookingDate,
          startTime: b.startTime,
          peopleCount: b.peopleCount,
          totalPrice: b.totalPrice,
          status: b.status,
          notes: b.notes,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: bookings.id });
    bookingCount = bookingResult.length;

    // 5. Guide reviews — showcase only
    const reviewResult = await db
      .insert(guideReviews)
      .values(
        showcaseGuideReviews.map((r) => ({
          id: r.id,
          bookingId: r.bookingId,
          guideId: r.guideId,
          reviewerId: r.reviewerId,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          guideReply: r.guideReply,
          isActive: r.isActive,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: guideReviews.id });
    reviewCount = reviewResult.length;
  }

  logSummary('guide-booking', layer, {
    attractions: attractionResult.length,
    guides: guideResult.length,
    packages: packageResult.length,
    ...(layer === 'showcase' && {
      bookings: bookingCount,
      reviews: reviewCount,
    }),
  });
}

main()
  .catch((error: unknown) => {
    console.error('Guide-booking seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pgClient.end());
