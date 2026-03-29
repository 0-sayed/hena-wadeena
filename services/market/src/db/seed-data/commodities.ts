import { COMMODITY, USER } from '../../../../../scripts/seed/shared-ids.js';

export const commodities = [
  {
    id: COMMODITY.CM01,
    nameAr: 'تمور',
    nameEn: 'Dates',
    category: 'fruits' as const,
    unit: 'kg' as const,
    sortOrder: 1,
  },
  {
    id: COMMODITY.CM02,
    nameAr: 'زيتون',
    nameEn: 'Olives',
    category: 'fruits' as const,
    unit: 'kg' as const,
    sortOrder: 2,
  },
  {
    id: COMMODITY.CM03,
    nameAr: 'زيت زيتون',
    nameEn: 'Olive Oil',
    category: 'oils' as const,
    unit: 'liter' as const,
    sortOrder: 3,
  },
  {
    id: COMMODITY.CM04,
    nameAr: 'قمح',
    nameEn: 'Wheat',
    category: 'grains' as const,
    unit: 'ton' as const,
    sortOrder: 4,
  },
  {
    id: COMMODITY.CM05,
    nameAr: 'برسيم',
    nameEn: 'Alfalfa',
    category: 'grains' as const,
    unit: 'ton' as const,
    sortOrder: 5,
  },
  {
    id: COMMODITY.CM06,
    nameAr: 'برتقال',
    nameEn: 'Oranges',
    category: 'fruits' as const,
    unit: 'kg' as const,
    sortOrder: 6,
  },
  {
    id: COMMODITY.CM07,
    nameAr: 'مانجو',
    nameEn: 'Mangoes',
    category: 'fruits' as const,
    unit: 'kg' as const,
    sortOrder: 7,
  },
  {
    id: COMMODITY.CM08,
    nameAr: 'فول سوداني',
    nameEn: 'Peanuts',
    category: 'grains' as const,
    unit: 'kg' as const,
    sortOrder: 8,
  },
  {
    id: COMMODITY.CM09,
    nameAr: 'مشمش',
    nameEn: 'Apricots',
    category: 'fruits' as const,
    unit: 'kg' as const,
    sortOrder: 9,
  },
  {
    id: COMMODITY.CM10,
    nameAr: 'كمون',
    nameEn: 'Cumin',
    category: 'other' as const,
    unit: 'kg' as const,
    sortOrder: 10,
  },
];

/** Showcase: 5 months of price data per commodity × 3 price types × 5 regions */
export function generatePriceSnapshots() {
  const regions = ['الخارجة', 'الداخلة', 'الفرافرة', 'باريس', 'بلاط'];
  const months = [
    new Date('2025-11-01'),
    new Date('2025-12-01'),
    new Date('2026-01-01'),
    new Date('2026-02-01'),
    new Date('2026-03-01'),
  ];
  // Base retail prices in piasters per unit
  const basePrices: Record<string, number> = {
    [COMMODITY.CM01]: 8000, // dates: 80 EGP/kg
    [COMMODITY.CM02]: 8500, // olives: 85 EGP/kg
    [COMMODITY.CM03]: 30000, // olive oil: 300 EGP/liter
    [COMMODITY.CM04]: 1000, // wheat: 10 EGP/kg (≈1500/ardeb)
    [COMMODITY.CM05]: 800, // alfalfa: 8 EGP/kg
    [COMMODITY.CM06]: 3000, // oranges: 30 EGP/kg
    [COMMODITY.CM07]: 6000, // mangoes: 60 EGP/kg
    [COMMODITY.CM08]: 5000, // peanuts: 50 EGP/kg
    [COMMODITY.CM09]: 4000, // apricots: 40 EGP/kg
    [COMMODITY.CM10]: 15000, // cumin: 150 EGP/kg
  };

  const records: {
    commodityId: string;
    price: number;
    priceType: 'retail' | 'wholesale' | 'farm_gate';
    region: string;
    source: string;
    recordedAt: Date;
    recordedBy: string;
  }[] = [];

  for (const commodity of commodities) {
    const base = basePrices[commodity.id] ?? 5000;
    for (const month of months) {
      for (const region of regions) {
        // Retail price with ±10% regional variation
        const variation = 0.9 + Math.random() * 0.2;
        const retail = Math.round(base * variation);
        records.push({
          commodityId: commodity.id,
          price: retail,
          priceType: 'retail',
          region,
          source: 'بيانات السوق المحلي',
          recordedAt: month,
          recordedBy: USER.ADMIN_SAYED,
        });
        // Wholesale is ~70% of retail
        records.push({
          commodityId: commodity.id,
          price: Math.round(retail * 0.7),
          priceType: 'wholesale',
          region,
          source: 'بيانات السوق المحلي',
          recordedAt: month,
          recordedBy: USER.ADMIN_SAYED,
        });
        // Farm gate is ~50% of retail
        records.push({
          commodityId: commodity.id,
          price: Math.round(retail * 0.5),
          priceType: 'farm_gate',
          region,
          source: 'بيانات المزارعين',
          recordedAt: month,
          recordedBy: USER.ADMIN_SAYED,
        });
      }
    }
  }

  return records;
}
