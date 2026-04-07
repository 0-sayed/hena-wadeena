import { BUSINESS, COMMODITY } from '../../../../../scripts/seed/shared-ids.js';

/** Maps businesses to commodities they trade — showcase only */
export const showcaseBusinessCommodities: { businessId: string; commodityId: string }[] = [
  // BD01 – Oasis Date Farms: dates, mangoes, apricots
  { businessId: BUSINESS.BD01, commodityId: COMMODITY.CM01 }, // Dates
  { businessId: BUSINESS.BD01, commodityId: COMMODITY.CM07 }, // Mangoes
  { businessId: BUSINESS.BD01, commodityId: COMMODITY.CM09 }, // Apricots
  // BD02 – Valley Oil Factory: olive oil, olives
  { businessId: BUSINESS.BD02, commodityId: COMMODITY.CM03 }, // Olive Oil
  { businessId: BUSINESS.BD02, commodityId: COMMODITY.CM02 }, // Olives
  // BD03 – Farafra Agricultural Cooperative: wheat, alfalfa, dates, oranges
  { businessId: BUSINESS.BD03, commodityId: COMMODITY.CM04 }, // Wheat
  { businessId: BUSINESS.BD03, commodityId: COMMODITY.CM05 }, // Alfalfa
  { businessId: BUSINESS.BD03, commodityId: COMMODITY.CM01 }, // Dates
  { businessId: BUSINESS.BD03, commodityId: COMMODITY.CM06 }, // Oranges
  // BD05 – New Valley Bakery: wheat (raw input), peanuts (for products)
  { businessId: BUSINESS.BD05, commodityId: COMMODITY.CM04 }, // Wheat
  { businessId: BUSINESS.BD05, commodityId: COMMODITY.CM08 }, // Peanuts
];
