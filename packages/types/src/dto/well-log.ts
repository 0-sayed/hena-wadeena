import type { NvDistrict } from '../enums';

export interface WellLogDto {
  id: string;
  area: NvDistrict;
  pump_hours: string;           // numeric returns as string from Drizzle
  kwh_consumed: string;
  cost_piasters: number;
  water_m3_est: string | null;
  depth_to_water_m: string | null;
  logged_at: string;            // YYYY-MM-DD
  created_at: string;           // ISO timestamp
}

export interface WellMonthlySummaryDto {
  year_month: string;           // "2025-03"
  total_pump_hours: number;
  total_kwh: number;
  total_cost_piasters: number;
  avg_cost_per_m3_piasters: number | null;
  avg_depth_to_water_m: number | null;
}

export interface SolarEstimateDto {
  avg_monthly_kwh: number;
  avg_monthly_cost_piasters: number;
  estimated_monthly_saving_piasters: number;
  farmer_net_cost_piasters: number;
  break_even_months: number | null;
  nrea_url: string;
}

export interface AreaSummaryDto {
  area: NvDistrict;
  total_logs: number;
  total_kwh: number;
  total_cost_piasters: number;
  avg_depth_to_water_m: number | null;
  last_logged_at: string | null;  // YYYY-MM-DD or null
}
