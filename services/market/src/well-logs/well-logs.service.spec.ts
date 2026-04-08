import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb } from '../shared/test-helpers';

import { WellLogsService } from './well-logs.service';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockWellLog = {
  id: 'well-log-uuid-001',
  farmerId: 'farmer-uuid-001',
  location: null,
  area: 'kharga' as const,
  pumpHours: '6.50',
  kwhConsumed: '32.75',
  costPiasters: 4800,
  waterM3Est: null,
  depthToWaterM: null,
  loggedAt: '2026-03-15',
  createdAt: new Date('2026-03-15T08:00:00.000Z'),
};

const createDto = {
  area: 'kharga',
  pump_hours: 6.5,
  kwh_consumed: 32.75,
  cost_piasters: 4800,
  logged_at: '2026-03-15',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WellLogsService', () => {
  let service: WellLogsService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
    service = new WellLogsService(mockDb as never);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should insert a well log and return it with farmer_id from argument', async () => {
      mockDb.returning.mockResolvedValueOnce([mockWellLog]);

      const result = await service.create(createDto as never, 'farmer-uuid-001');

      expect(result).toMatchObject({
        id: 'well-log-uuid-001',
        area: 'kharga',
        pump_hours: '6.50',
        cost_piasters: 4800,
        logged_at: '2026-03-15',
      });
      expect(mockDb.insert).toHaveBeenCalled();
      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      expect(valuesArg.farmerId).toBe('farmer-uuid-001');
    });

    it('should convert numeric fields to strings before inserting', async () => {
      mockDb.returning.mockResolvedValueOnce([mockWellLog]);

      await service.create(createDto as never, 'farmer-uuid-001');

      const valuesArg = mockDb.values.mock.calls[0]![0] as Record<string, unknown>;
      expect(typeof valuesArg.pumpHours).toBe('string');
      expect(typeof valuesArg.kwhConsumed).toBe('string');
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should scope results to the calling farmer and return PaginatedResponse', async () => {
      mockDb.execute
        .mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockWellLog]); // data query

      const result = await service.findAll('farmer-uuid-001', {
        offset: 0,
        limit: 20,
      } as never);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should apply date-range filters when from/to are provided', async () => {
      mockDb.execute.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

      await service.findAll('farmer-uuid-001', {
        offset: 0,
        limit: 20,
        from: '2026-01-01',
        to: '2026-03-31',
      } as never);

      // where() is called (conditions were built)
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  // ── getSummary ────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('should return monthly summary and solar estimate when ≥3 months of data exist', async () => {
      const monthRows = [
        {
          year_month: '2026-03',
          total_pump_hours: '120',
          total_kwh: '600',
          total_cost_piasters: '50000',
          avg_cost_per_m3_piasters: null,
          avg_depth_to_water_m: '45.0',
        },
        {
          year_month: '2026-02',
          total_pump_hours: '110',
          total_kwh: '550',
          total_cost_piasters: '46000',
          avg_cost_per_m3_piasters: null,
          avg_depth_to_water_m: null,
        },
        {
          year_month: '2026-01',
          total_pump_hours: '130',
          total_kwh: '650',
          total_cost_piasters: '52000',
          avg_cost_per_m3_piasters: null,
          avg_depth_to_water_m: null,
        },
      ];
      mockDb.execute.mockResolvedValueOnce(monthRows);

      const result = await service.getSummary('farmer-uuid-001');

      expect(result.months).toHaveLength(3);
      expect(result.months[0]!.year_month).toBe('2026-03');
      expect(result.months[0]!.total_kwh).toBe(600);
      expect(result.months[0]!.avg_depth_to_water_m).toBe(45.0);
      expect(result.months[1]!.avg_depth_to_water_m).toBeNull();

      // avg monthly cost = (50000 + 46000 + 52000) / 3 = 49333.33...
      // break_even = Math.round(4_500_000 / 49333.33) = 91
      expect(result.solar).not.toBeNull();
      expect(result.solar!.farmer_net_cost_piasters).toBe(4_500_000);
      expect(result.solar!.nrea_url).toBe('https://www.nrea.gov.eg');
      expect(result.solar!.estimated_monthly_saving_piasters).toBe(
        result.solar!.avg_monthly_cost_piasters,
      );
      expect(typeof result.solar!.break_even_months).toBe('number');
    });

    it('should return solar: null when fewer than 3 months of data exist', async () => {
      mockDb.execute.mockResolvedValueOnce([
        {
          year_month: '2026-03',
          total_pump_hours: '100',
          total_kwh: '500',
          total_cost_piasters: '40000',
          avg_cost_per_m3_piasters: null,
          avg_depth_to_water_m: null,
        },
        {
          year_month: '2026-02',
          total_pump_hours: '110',
          total_kwh: '550',
          total_cost_piasters: '45000',
          avg_cost_per_m3_piasters: null,
          avg_depth_to_water_m: null,
        },
      ]);

      const result = await service.getSummary('farmer-uuid-001');

      expect(result.months).toHaveLength(2);
      expect(result.solar).toBeNull();
    });

    it('should return { months: [], solar: null } when no data exists', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.getSummary('farmer-uuid-001');

      expect(result).toEqual({ months: [], solar: null });
    });
  });

  // ── getAreaSummary ────────────────────────────────────────────────────────

  describe('getAreaSummary', () => {
    it('should return area summaries with numeric conversions applied', async () => {
      mockDb.execute.mockResolvedValueOnce([
        {
          area: 'kharga',
          total_logs: '5',
          total_kwh: '3000',
          total_cost_piasters: '250000',
          avg_depth_to_water_m: '45.5',
          last_logged_at: '2026-03-15',
        },
        {
          area: 'dakhla',
          total_logs: '2',
          total_kwh: '900',
          total_cost_piasters: '80000',
          avg_depth_to_water_m: null,
          last_logged_at: '2026-02-28',
        },
      ]);

      const result = await service.getAreaSummary();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        area: 'kharga',
        total_logs: 5,
        total_kwh: 3000,
        total_cost_piasters: 250000,
        avg_depth_to_water_m: 45.5,
        last_logged_at: '2026-03-15',
      });
      expect(result[1]!.avg_depth_to_water_m).toBeNull();
    });

    it('should return an empty array when no logs exist', async () => {
      mockDb.execute.mockResolvedValueOnce([]);

      const result = await service.getAreaSummary();

      expect(result).toEqual([]);
    });
  });
});
