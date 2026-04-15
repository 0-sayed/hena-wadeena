import { USER, WELL_LOG } from '../../../../../scripts/seed/shared-ids.js';

export interface SeedWellLog {
  id: string;
  farmerId: string;
  area: 'kharga' | 'dakhla' | 'farafra' | 'baris' | 'balat';
  pumpHours: string;
  kwhConsumed: string;
  costPiasters: number;
  waterM3Est?: string;
  depthToWaterM?: string;
  loggedAt: string;
}

/**
 * 8 months of well-log data for Ibrahim the farmer.
 * Spans Aug 2025 – Mar 2026, covering multiple NvDistrict areas.
 * ≥3 months guarantees the solar estimator card renders on FarmerDashboard.
 *
 * Pump spec: 7.5 kW centrifugal, depth ~40–52 m.
 * Cost rate: 52 piasters/kWh (commercial tariff).
 * Water yield: ~60 m³/h.
 */
export const essentialWellLogs: SeedWellLog[] = [
  {
    id: WELL_LOG.WL01,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'kharga',
    pumpHours: '168.00',
    kwhConsumed: '1260.00',
    costPiasters: 65520,
    waterM3Est: '10080.00',
    depthToWaterM: '45.0',
    loggedAt: '2025-08-31',
  },
  {
    id: WELL_LOG.WL02,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'kharga',
    pumpHours: '180.00',
    kwhConsumed: '1350.00',
    costPiasters: 70200,
    waterM3Est: '10800.00',
    depthToWaterM: '45.0',
    loggedAt: '2025-09-30',
  },
  {
    id: WELL_LOG.WL03,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'dakhla',
    pumpHours: '192.00',
    kwhConsumed: '1440.00',
    costPiasters: 74880,
    waterM3Est: '11520.00',
    depthToWaterM: '38.5',
    loggedAt: '2025-10-31',
  },
  {
    id: WELL_LOG.WL04,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'kharga',
    pumpHours: '155.00',
    kwhConsumed: '1162.50',
    costPiasters: 60450,
    waterM3Est: '9300.00',
    depthToWaterM: '46.2',
    loggedAt: '2025-11-30',
  },
  {
    id: WELL_LOG.WL05,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'kharga',
    pumpHours: '145.00',
    kwhConsumed: '1087.50',
    costPiasters: 56550,
    waterM3Est: '8700.00',
    depthToWaterM: '46.8',
    loggedAt: '2025-12-31',
  },
  {
    id: WELL_LOG.WL06,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'farafra',
    pumpHours: '160.00',
    kwhConsumed: '1200.00',
    costPiasters: 62400,
    waterM3Est: '9600.00',
    depthToWaterM: '52.0',
    loggedAt: '2026-01-31',
  },
  {
    id: WELL_LOG.WL07,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'kharga',
    pumpHours: '175.00',
    kwhConsumed: '1312.50',
    costPiasters: 68250,
    waterM3Est: '10500.00',
    depthToWaterM: '45.5',
    loggedAt: '2026-02-28',
  },
  {
    id: WELL_LOG.WL08,
    farmerId: USER.FARMER_IBRAHIM,
    area: 'baris',
    pumpHours: '200.00',
    kwhConsumed: '1500.00',
    costPiasters: 78000,
    waterM3Est: '12000.00',
    depthToWaterM: '41.3',
    loggedAt: '2026-03-31',
  },
];
