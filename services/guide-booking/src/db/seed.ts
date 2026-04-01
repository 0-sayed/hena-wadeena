import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getLayer, logSummary, point } from '../../../../scripts/seed/seed-utils.js';

import {
  attractions,
  bookings,
  guideReviews,
  guides,
  tourPackageAttractions,
  tourPackages,
} from './schema/index.js';
import { essentialAttractions, showcaseAttractions } from './seed-data/attractions.js';
import { showcaseBookings } from './seed-data/bookings.js';
import { essentialGuides, showcaseGuides } from './seed-data/guides.js';
import {
  essentialPackageAttractions,
  showcasePackageAttractions,
} from './seed-data/package-attractions.js';
import { essentialPackages, showcasePackages } from './seed-data/packages.js';
import { showcaseGuideReviews } from './seed-data/reviews.js';

// ── Real image URLs ──────────────────────────────────────────────────────────
// Wikimedia Commons for actual New Valley sites; Unsplash (verified IDs) for guides
type ImgPair = [string, string];

// Every attraction has a unique image pair — no duplicates across attractions
const ATTRACTION_IMGS: Record<string, ImgPair> = {
  // ── Essential (A01–A03) ─────────────────────────────────────────────────────
  'temple-of-hibis': ['/images/seed/wiki-hibis-1.jpg', '/images/seed/wiki-hibis-2.jpg'],
  'white-desert': ['/images/seed/wiki-white-desert-1.jpg', '/images/seed/wiki-white-desert-2.jpg'],
  'al-qasr-old-town': ['/images/seed/wiki-al-qasr-1.jpg', '/images/seed/wiki-al-qasr-2.jpg'],
  // ── Showcase (A04–A10) with dedicated Wikimedia images ─────────────────────
  'bagawat-necropolis': ['/images/seed/wiki-bagawat-1.jpg', '/images/seed/wiki-bagawat-2.jpg'],
  'qasr-al-ghuytta': ['/images/seed/wiki-ghuytta-1.jpg', '/images/seed/wiki-ghuytta-2.jpg'],
  'deir-el-hagar': [
    '/images/seed/wiki-deir-el-hagar-1.jpg',
    '/images/seed/wiki-deir-el-hagar-2.jpg',
  ],
  'ain-moat-talata': [
    '/images/seed/wiki-magic-spring-1.jpg',
    '/images/seed/wiki-magic-spring-2.jpg',
  ],
  'crystal-mountain': [
    '/images/seed/wiki-crystal-mountain-1.jpg',
    '/images/seed/wiki-crystal-mountain-2.jpg',
  ],
  'agabat-valley': ['/images/seed/WGYGBTqfZSc.jpg', '/images/seed/VmFFbYAp7oA.jpg'],
  'temple-of-dush': ['/images/seed/wiki-dush-1.jpg', '/images/seed/wiki-dush-2.jpg'],
  // ── Showcase (A11–A25) with unique Unsplash images ─────────────────────────
  'qasr-al-zayan': ['/images/seed/pvFtrzwuc6g.jpg', '/images/seed/76b6YwvvjdQ.jpg'],
  'qasr-al-labkha': ['/images/seed/GTigSDuTiN4.jpg', '/images/seed/a8ZSKCBE1xk.jpg'],
  'nadura-temple': ['/images/seed/3FRX4F_Kjak.jpg', '/images/seed/DZOIE5bQGBg.jpg'],
  'new-valley-museum': ['/images/seed/umfgtmwR__Y.jpg', '/images/seed/GNdp2Q4VZjw.jpg'],
  'muzawwaqa-tombs': ['/images/seed/wiki-muzawwaqa-1.jpg', '/images/seed/wiki-muzawwaqa-2.jpg'],
  'bashindi-village': ['/images/seed/T4hZdDQElBc.jpg', '/images/seed/AFuVCldRhjs.jpg'],
  'bir-al-jabal': ['/images/seed/sl71uVi8xxM.jpg', '/images/seed/aSzaYMxRWjE.jpg'],
  'ain-asil': ['/images/seed/Rk8yY0UfPx0.jpg', '/images/seed/v4tLl97tXBY.jpg'],
  'qalat-al-duba': ['/images/seed/wiki-zaiyan-1.jpg', '/images/seed/wiki-zaiyan-2.jpg'],
  'balat-old-city': ['/images/seed/eXVWq4_vMDA.jpg', '/images/seed/MB2eoqiNKiw.jpg'],
  'black-desert': [
    '/images/seed/extra-1506905925346-21bda4d32df4.jpg',
    '/images/seed/1vBXUCb-bXQ.jpg',
  ],
  'bir-sitta': ['/images/seed/wiki-farafra-well.jpg', '/images/seed/wiki-hot-springs.jpg'],
  'badr-museum': ['/images/seed/IJmbu7B6f8o.jpg', '/images/seed/KedoROoDqOo.jpg'],
  'hassan-fathy-village': [
    '/images/seed/wiki-new-gourna-1.jpg',
    '/images/seed/wiki-new-gourna-2.jpg',
  ],
  'baris-springs': ['/images/seed/wiki-baris-1.jpg', '/images/seed/wiki-baris-2.jpg'],
};

function getAttractionImages(slug: string): ImgPair {
  const imgs = ATTRACTION_IMGS[slug];
  if (!imgs) {
    // Should never happen — all attractions are covered above
    return [
      `https://picsum.photos/seed/${slug}-1/800/600`,
      `https://picsum.photos/seed/${slug}-2/800/600`,
    ];
  }
  return imgs;
}

// Verified Unsplash portrait IDs for each guide
const GUIDE_IMGS: Record<string, { profileImage: string; coverImage: string }> = {
  'NV-GUIDE-001': {
    // Youssef — archaeology/history
    profileImage: '/images/seed/5UBo4e1gPGE.jpg',
    coverImage: '/images/seed/extra-1507003211169-0a1dd7228f2d.jpg',
  },
  'NV-GUIDE-002': {
    // Fatma — desert safari
    profileImage: '/images/seed/VmFFbYAp7oA.jpg',
    coverImage: '/images/seed/IJmbu7B6f8o.jpg',
  },
  'NV-GUIDE-003': {
    // Ahmed — adventure / sandboarding
    profileImage: '/images/seed/D7jLZywWxrA.jpg',
    coverImage: '/images/seed/XaidrBZfEwU.jpg',
  },
  'NV-GUIDE-004': {
    // Mariam — wellness / hot springs
    profileImage: '/images/seed/rOYcYnT9SgM.jpg',
    coverImage: '/images/seed/KedoROoDqOo.jpg',
  },
  'NV-GUIDE-005': {
    // Omar — photography tours
    profileImage: '/images/seed/CgJdtLlMGC0.jpg',
    coverImage: '/images/seed/extra-1476514525535-07fb3b4ae5f1.jpg',
  },
};

function getGuideImages(licenseNumber: string): { profileImage: string; coverImage: string } {
  return (
    GUIDE_IMGS[licenseNumber] ?? {
      profileImage: `https://picsum.photos/seed/${licenseNumber}-profile/300/300`,
      coverImage: `https://picsum.photos/seed/${licenseNumber}-cover/1200/400`,
    }
  );
}

// Rotating Egypt imagery for tour packages
const PACKAGE_IMGS: ImgPair[] = [
  ['/images/seed/pvFtrzwuc6g.jpg', '/images/seed/76b6YwvvjdQ.jpg'],
  ['/images/seed/WGYGBTqfZSc.jpg', '/images/seed/IJmbu7B6f8o.jpg'],
  ['/images/seed/1wZngiswH4M.jpg', '/images/seed/KedoROoDqOo.jpg'],
  ['/images/seed/wiki-white-desert-1.jpg', '/images/seed/wiki-crystal-mountain-1.jpg'],
  ['/images/seed/umfgtmwR__Y.jpg', '/images/seed/pvFtrzwuc6g.jpg'],
];
// ─────────────────────────────────────────────────────────────────────────────

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
      allAttractions.map((a) => {
        const imgs = getAttractionImages(a.slug);
        return {
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
          thumbnail: imgs[0],
          images: imgs,
          location: point(a.lat, a.lon),
        };
      }),
    )
    .onConflictDoNothing()
    .returning({ id: attractions.id });

  // 2. Guides — essential always, showcase adds more
  const allGuides =
    layer === 'showcase' ? [...essentialGuides, ...showcaseGuides] : essentialGuides;

  const guideResult = await db
    .insert(guides)
    .values(
      allGuides.map((g) => {
        const imgs = getGuideImages(g.licenseNumber);
        return {
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
          profileImage: imgs.profileImage,
          coverImage: imgs.coverImage,
        };
      }),
    )
    .onConflictDoNothing()
    .returning({ id: guides.id });

  // 3. Tour packages — essential always, showcase adds more
  const allPackages =
    layer === 'showcase' ? [...essentialPackages, ...showcasePackages] : essentialPackages;

  const packageResult = await db
    .insert(tourPackages)
    .values(
      allPackages.map((p, i) => ({
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
        images: PACKAGE_IMGS[i % PACKAGE_IMGS.length],
      })),
    )
    .onConflictDoNothing()
    .returning({ id: tourPackages.id });

  // 4. Package-attraction links — essential always, showcase adds more
  const allPackageAttractions =
    layer === 'showcase'
      ? [...essentialPackageAttractions, ...showcasePackageAttractions]
      : essentialPackageAttractions;

  await db
    .insert(tourPackageAttractions)
    .values(
      allPackageAttractions.map((pa) => ({
        packageId: pa.packageId,
        attractionId: pa.attractionId,
        sortOrder: pa.sortOrder,
      })),
    )
    .onConflictDoNothing();

  let bookingCount = 0;
  let reviewCount = 0;

  if (layer === 'showcase') {
    // 6. Bookings — showcase only
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

    // 7. Guide reviews — showcase only
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
    packageAttractions: allPackageAttractions.length,
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
