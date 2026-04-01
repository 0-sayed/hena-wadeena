import { ATTRACTION, PACKAGE } from '../../../../../scripts/seed/shared-ids.js';

/**
 * Links tour packages to their included attractions.
 * sortOrder determines display order in package details.
 */
export interface SeedPackageAttraction {
  packageId: string;
  attractionId: string;
  sortOrder: number;
}

// Extra attraction IDs (A11–A25) defined locally in attractions.ts
const A13 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567813'; // Nadura Temple
const A18 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567818'; // Ain Asil
const A20 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567820'; // Balat Old City
const A21 = 'f1a2b3c4-d5e6-7890-abcd-ef1234567821'; // Black Desert

/**
 * Essential package-attraction links (only references A01-A03 essential attractions)
 *
 * Note: PK01/PK02 visit additional showcase attractions, but those links
 * are in showcasePackageAttractions to avoid FK violations in essential layer.
 */
export const essentialPackageAttractions: SeedPackageAttraction[] = [
  // PK01: Kharga Temples Tour — only Temple of Hibis in essential layer
  { packageId: PACKAGE.PK01, attractionId: ATTRACTION.A01, sortOrder: 1 }, // Temple of Hibis

  // PK02: Balat Archaeological Tour — uses showcase attractions only, see below
];

/**
 * Showcase package-attraction links (for PK03–PK10 showcase packages)
 * Also includes additional attractions for PK01/PK02 that require showcase layer.
 */
export const showcasePackageAttractions: SeedPackageAttraction[] = [
  // PK01: Kharga Temples Tour — additional showcase attractions
  { packageId: PACKAGE.PK01, attractionId: ATTRACTION.A04, sortOrder: 2 }, // Bagawat Necropolis
  { packageId: PACKAGE.PK01, attractionId: A13, sortOrder: 3 }, // Nadura Temple

  // PK02: Balat Archaeological Tour — all attractions are showcase
  { packageId: PACKAGE.PK02, attractionId: A20, sortOrder: 1 }, // Balat Old City
  { packageId: PACKAGE.PK02, attractionId: A18, sortOrder: 2 }, // Ain Asil

  // PK03: White Desert Safari — White Desert only (overnight camping)
  { packageId: PACKAGE.PK03, attractionId: ATTRACTION.A02, sortOrder: 1 }, // White Desert

  // PK04: White & Black Desert Day Tour — White Desert, Black Desert, Crystal Mountain
  { packageId: PACKAGE.PK04, attractionId: ATTRACTION.A02, sortOrder: 1 }, // White Desert
  { packageId: PACKAGE.PK04, attractionId: A21, sortOrder: 2 }, // Black Desert
  { packageId: PACKAGE.PK04, attractionId: ATTRACTION.A08, sortOrder: 3 }, // Crystal Mountain

  // PK05: Sandboarding Adventure — Agabat Valley
  { packageId: PACKAGE.PK05, attractionId: ATTRACTION.A09, sortOrder: 1 }, // Agabat Valley

  // PK06: Agabat Valley Camping — Agabat Valley
  { packageId: PACKAGE.PK06, attractionId: ATTRACTION.A09, sortOrder: 1 }, // Agabat Valley

  // PK07: Hot Springs Wellness Program — Ain Moat Talata
  { packageId: PACKAGE.PK07, attractionId: ATTRACTION.A07, sortOrder: 1 }, // Ain Moat Talata

  // PK08: Dakhla Relaxation Day — Al-Qasr + hot springs
  { packageId: PACKAGE.PK08, attractionId: ATTRACTION.A03, sortOrder: 1 }, // Al-Qasr Old Town
  { packageId: PACKAGE.PK08, attractionId: ATTRACTION.A07, sortOrder: 2 }, // Ain Moat Talata

  // PK09: Photography Tour — White Desert, Crystal Mountain, Agabat
  { packageId: PACKAGE.PK09, attractionId: ATTRACTION.A02, sortOrder: 1 }, // White Desert
  { packageId: PACKAGE.PK09, attractionId: ATTRACTION.A08, sortOrder: 2 }, // Crystal Mountain
  { packageId: PACKAGE.PK09, attractionId: ATTRACTION.A09, sortOrder: 3 }, // Agabat Valley

  // PK10: Sunset Photography Tour — White Desert
  { packageId: PACKAGE.PK10, attractionId: ATTRACTION.A02, sortOrder: 1 }, // White Desert
];
