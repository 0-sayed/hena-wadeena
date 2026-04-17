import { describe, expect, it } from 'vitest';

import { showcaseListings, showcaseProduceListingDetails } from './listings';

describe('listing seed data', () => {
  it('includes at least seven published produce listings with local images and produce details', () => {
    const produceListings = showcaseListings.filter(
      (listing) => listing.category === 'agricultural_produce' && listing.isPublished,
    );

    expect(produceListings).toHaveLength(7);
    expect(new Set(produceListings.map((listing) => listing.slug)).size).toBe(7);

    for (const listing of produceListings) {
      expect(listing.images).toHaveLength(2);
      expect(listing.images?.every((image) => image.startsWith('/images/seed/'))).toBe(true);
      expect(showcaseProduceListingDetails).toContainEqual(
        expect.objectContaining({
          listingId: listing.id,
        }),
      );
    }
  });

  it('includes four published solar_installer listings in the showcase layer', () => {
    const solarListings = showcaseListings.filter(
      (listing) => listing.category === 'solar_installer' && listing.isPublished,
    );

    expect(solarListings).toHaveLength(4);
    expect(new Set(solarListings.map((l) => l.slug)).size).toBe(4);

    for (const listing of solarListings) {
      expect(listing.district).toBeTruthy();
      expect(listing.lat).toBeGreaterThan(0);
      expect(listing.lon).toBeGreaterThan(0);
      expect(listing.features).toBeDefined();
      expect((listing.features as Record<string, unknown>)['nrea_cert_number']).toBeTruthy();
    }
  });
});
