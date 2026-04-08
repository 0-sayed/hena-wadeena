import { DRIZZLE_CLIENT, generateId } from '@hena-wadeena/nest-common';
import {
  AreaSummaryDto,
  NvDistrict,
  PaginatedResponse,
  SolarEstimateDto,
  WellLogDto,
  WellMonthlySummaryDto,
} from '@hena-wadeena/types';
import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { wellLogs } from '../db/schema/well-logs';
import { andRequired, firstOrThrow, paginate } from '../shared/query-helpers';

import { CreateWellLogDto } from './dto/create-well-log.dto';
import { QueryWellLogsDto } from './dto/query-well-logs.dto';

// ── Solar estimator constants ─────────────────────────────────────────────────
// Source: NREA (nrea.gov.eg) published figures.
// 5 kW standard residential solar pump; 70% capital subsidy;
// typical installed cost ≈ 150,000 EGP = 15,000,000 piasters.
const INSTALLED_COST_PIASTERS = 15_000_000;
const SUBSIDY_RATE = 0.7;
const FARMER_NET_COST_PIASTERS = Math.round(INSTALLED_COST_PIASTERS * (1 - SUBSIDY_RATE)); // 4,500,000
const NREA_URL = 'https://www.nrea.gov.eg';
const MIN_MONTHS_FOR_ESTIMATE = 3;
// ─────────────────────────────────────────────────────────────────────────────

interface MonthlySummaryRow extends Record<string, unknown> {
  year_month: string;
  total_pump_hours: string;
  total_kwh: string;
  total_cost_piasters: string;
  avg_cost_per_m3_piasters: string | null;
  avg_depth_to_water_m: string | null;
}

interface AreaSummaryRow extends Record<string, unknown> {
  area: NvDistrict;
  total_logs: string;
  total_kwh: string;
  total_cost_piasters: string;
  avg_depth_to_water_m: string | null;
  last_logged_at: string | null;
}

@Injectable()
export class WellLogsService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: PostgresJsDatabase) {}

  async create(dto: CreateWellLogDto, farmerId: string): Promise<WellLogDto> {
    const rows = await this.db
      .insert(wellLogs)
      .values({
        id: generateId(),
        farmerId,
        area: dto.area,
        pumpHours: String(dto.pump_hours),
        kwhConsumed: String(dto.kwh_consumed),
        costPiasters: dto.cost_piasters,
        waterM3Est: dto.water_m3_est != null ? String(dto.water_m3_est) : null,
        depthToWaterM: dto.depth_to_water_m != null ? String(dto.depth_to_water_m) : null,
        loggedAt: dto.logged_at,
      })
      .returning();

    return this.toDto(firstOrThrow(rows));
  }

  async findAll(farmerId: string, query: QueryWellLogsDto): Promise<PaginatedResponse<WellLogDto>> {
    const where = andRequired(
      eq(wellLogs.farmerId, farmerId),
      query.from ? gte(wellLogs.loggedAt, query.from) : undefined,
      query.to ? lte(wellLogs.loggedAt, query.to) : undefined,
    );

    const [countRows, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(wellLogs)
        .where(where)
        .execute(),
      this.db
        .select()
        .from(wellLogs)
        .where(where)
        .orderBy(desc(wellLogs.loggedAt))
        .offset(query.offset)
        .limit(query.limit)
        .execute(),
    ]);
    const total = countRows[0]?.count ?? 0;

    return paginate(
      rows.map((r) => this.toDto(r)),
      total,
      query.offset,
      query.limit,
    );
  }

  async getSummary(farmerId: string): Promise<{
    months: WellMonthlySummaryDto[];
    solar: SolarEstimateDto | null;
  }> {
    const rows = await this.db.execute<MonthlySummaryRow>(sql`
      SELECT
        to_char(logged_at, 'YYYY-MM')   AS year_month,
        SUM(pump_hours)::text            AS total_pump_hours,
        SUM(kwh_consumed)::text          AS total_kwh,
        SUM(cost_piasters)::text         AS total_cost_piasters,
        AVG(
          CASE WHEN water_m3_est IS NOT NULL AND water_m3_est > 0
               THEN cost_piasters::numeric / water_m3_est
               ELSE NULL END
        )::text                          AS avg_cost_per_m3_piasters,
        AVG(depth_to_water_m)::text      AS avg_depth_to_water_m
      FROM market.well_logs
      WHERE farmer_id = ${farmerId}
        AND logged_at >= (CURRENT_DATE - INTERVAL '12 months')
      GROUP BY year_month
      ORDER BY year_month DESC
    `);

    if (rows.length === 0) {
      return { months: [], solar: null };
    }

    const months: WellMonthlySummaryDto[] = rows.map((r) => ({
      year_month: r.year_month,
      total_pump_hours: Number(r.total_pump_hours),
      total_kwh: Number(r.total_kwh),
      total_cost_piasters: Number(r.total_cost_piasters),
      avg_cost_per_m3_piasters:
        r.avg_cost_per_m3_piasters != null ? Number(r.avg_cost_per_m3_piasters) : null,
      avg_depth_to_water_m: r.avg_depth_to_water_m != null ? Number(r.avg_depth_to_water_m) : null,
    }));

    return { months, solar: this.computeSolarEstimate(months) };
  }

  async getAreaSummary(): Promise<AreaSummaryDto[]> {
    const rows = await this.db.execute<AreaSummaryRow>(sql`
      SELECT
        area,
        COUNT(*)::text            AS total_logs,
        SUM(kwh_consumed)::text   AS total_kwh,
        SUM(cost_piasters)::text  AS total_cost_piasters,
        AVG(depth_to_water_m)::text AS avg_depth_to_water_m,
        MAX(logged_at)::text      AS last_logged_at
      FROM market.well_logs
      GROUP BY area
      ORDER BY area
    `);

    return rows.map((r) => ({
      area: r.area,
      total_logs: Number(r.total_logs),
      total_kwh: Number(r.total_kwh),
      total_cost_piasters: Number(r.total_cost_piasters),
      avg_depth_to_water_m: r.avg_depth_to_water_m != null ? Number(r.avg_depth_to_water_m) : null,
      last_logged_at: r.last_logged_at ?? null,
    }));
  }

  private computeSolarEstimate(months: WellMonthlySummaryDto[]): SolarEstimateDto | null {
    if (months.length < MIN_MONTHS_FOR_ESTIMATE) return null;

    const avg_monthly_kwh = months.reduce((s, m) => s + m.total_kwh, 0) / months.length;
    const avg_monthly_cost_piasters =
      months.reduce((s, m) => s + m.total_cost_piasters, 0) / months.length;

    return {
      avg_monthly_kwh,
      avg_monthly_cost_piasters,
      estimated_monthly_saving_piasters: avg_monthly_cost_piasters, // assumes 100% grid cost replaced by solar
      farmer_net_cost_piasters: FARMER_NET_COST_PIASTERS,
      break_even_months:
        avg_monthly_cost_piasters > 0
          ? Math.round(FARMER_NET_COST_PIASTERS / avg_monthly_cost_piasters)
          : null,
      nrea_url: NREA_URL,
    };
  }

  private toDto(row: typeof wellLogs.$inferSelect): WellLogDto {
    return {
      id: row.id,
      area: row.area,
      pump_hours: row.pumpHours,
      kwh_consumed: row.kwhConsumed,
      cost_piasters: row.costPiasters,
      water_m3_est: row.waterM3Est,
      depth_to_water_m: row.depthToWaterM,
      logged_at: row.loggedAt,
      created_at: row.createdAt.toISOString(),
    };
  }
}
