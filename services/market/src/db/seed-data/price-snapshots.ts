/** Real-estate price snapshots per district × listing type × month — showcase only */
export function generatePriceSnapshotData() {
  const districts = ['kharga', 'dakhla', 'farafra', 'baris', 'balat'];
  const months = ['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01'];

  // Base avg prices in piasters (EGP × 100)
  // Real estate in New Valley is significantly cheaper than Cairo
  const basePrices: Record<string, Record<string, number>> = {
    real_estate: {
      kharga: 450_000_00, // 450,000 EGP avg apartment
      dakhla: 380_000_00, // 380,000 EGP
      farafra: 280_000_00, // 280,000 EGP
      baris: 220_000_00, // 220,000 EGP
      balat: 200_000_00, // 200,000 EGP
    },
    land: {
      kharga: 120_000_00, // 120,000 EGP/feddan avg
      dakhla: 100_000_00,
      farafra: 70_000_00,
      baris: 50_000_00,
      balat: 45_000_00,
    },
    business: {
      kharga: 800_000_00, // 800,000 EGP avg commercial
      dakhla: 600_000_00,
      farafra: 350_000_00,
      baris: 250_000_00,
      balat: 220_000_00,
    },
  };

  const records: {
    district: string;
    listingType: 'real_estate' | 'land' | 'business';
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    sampleCount: number;
    snapshotDate: string;
  }[] = [];

  for (const district of districts) {
    for (const listingType of ['real_estate', 'land', 'business'] as const) {
      const base = basePrices[listingType][district];
      for (let i = 0; i < months.length; i++) {
        // Slight month-over-month growth (+1.5% per month)
        const growth = Math.pow(1.015, i);
        const avg = Math.round(base * growth);
        const min = Math.round(avg * 0.55);
        const max = Math.round(avg * 1.65);
        const sampleCount = 3 + Math.floor(Math.random() * 8); // 3–10 listings sampled
        records.push({
          district,
          listingType,
          avgPrice: avg,
          minPrice: min,
          maxPrice: max,
          sampleCount,
          snapshotDate: months[i],
        });
      }
    }
  }

  return records;
}
