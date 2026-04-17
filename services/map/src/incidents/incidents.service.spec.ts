import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateIncidentDto } from './dto/create-incident.dto';
import { IncidentFiltersDto } from './dto/incident-filters.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentsService } from './incidents.service';

type ThenFn = (
  onFulfilled: (v: unknown[]) => unknown,
  onRejected?: (err: unknown) => unknown,
) => Promise<unknown>;

type ChainMethod =
  | 'select'
  | 'from'
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'offset'
  | 'insert'
  | 'values'
  | 'returning'
  | 'update'
  | 'set';

type MockChain = Record<ChainMethod, ReturnType<typeof vi.fn>> & {
  then: ReturnType<typeof vi.fn<ThenFn>>;
};

function createMockDb(): MockChain {
  const chain = {} as MockChain;

  const methods: ChainMethod[] = [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
    'insert',
    'values',
    'returning',
    'update',
    'set',
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.then = vi
    .fn<ThenFn>()
    .mockImplementation((onFulfilled, onRejected) =>
      Promise.resolve([]).then(onFulfilled, onRejected),
    );

  return chain;
}

function resolveWith(values: unknown[]) {
  return (fn: (v: unknown[]) => unknown) => Promise.resolve(values).then(fn);
}

const mockIncident = {
  id: 'incident-uuid-1',
  reporterId: 'reporter-uuid-1',
  incidentType: 'litter' as const,
  status: 'reported' as const,
  descriptionAr: 'نفايات في المنطقة',
  descriptionEn: 'Litter near the formation',
  location: { x: 28.35, y: 27.03 },
  photos: [] as string[],
  eeaaReference: null,
  adminNotes: null,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('IncidentsService', () => {
  let service: IncidentsService;
  let mockDb: MockChain;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new IncidentsService(mockDb as never);
  });

  describe('create', () => {
    it('should create an incident with reported status and return the row', async () => {
      const created = { ...mockIncident };
      mockDb.then.mockImplementationOnce(resolveWith([created]));

      const dto: CreateIncidentDto = {
        incidentType: 'litter',
        latitude: 27.03,
        longitude: 28.35,
        descriptionEn: 'Litter near the formation',
      } as CreateIncidentDto;

      const result = await service.create('reporter-uuid-1', dto);

      expect(result.status).toBe('reported');
      expect(result.reporterId).toBe('reporter-uuid-1');
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
    });

    it('should default photos to empty array when not provided', async () => {
      const created = { ...mockIncident, photos: [] };
      mockDb.then.mockImplementationOnce(resolveWith([created]));

      const dto: CreateIncidentDto = {
        incidentType: 'illegal_dumping',
        latitude: 27.03,
        longitude: 28.35,
      } as CreateIncidentDto;

      const result = await service.create('reporter-uuid-1', dto);

      expect(result.photos).toEqual([]);
    });

    it('should throw InternalServerErrorException when the insert returns no row', async () => {
      mockDb.then.mockImplementationOnce(resolveWith([]));

      const dto: CreateIncidentDto = {
        incidentType: 'illegal_dumping',
        latitude: 27.03,
        longitude: 28.35,
      } as CreateIncidentDto;

      await expect(service.create('reporter-uuid-1', dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an incident by id', async () => {
      mockDb.then.mockImplementationOnce(resolveWith([mockIncident]));

      const result = await service.findOne('incident-uuid-1');

      expect(result.id).toBe('incident-uuid-1');
      expect(result.incidentType).toBe('litter');
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw NotFoundException when incident does not exist', async () => {
      mockDb.then.mockImplementationOnce(resolveWith([]));

      await expect(service.findOne('nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated incidents with correct structure', async () => {
      mockDb.then
        .mockImplementationOnce(resolveWith([mockIncident]))
        .mockImplementationOnce(resolveWith([{ count: 1 }]));

      const filters: IncidentFiltersDto = { page: 1, limit: 20 } as IncidentFiltersDto;
      const result = await service.findAll(filters);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.data[0]!.id).toBe('incident-uuid-1');
    });

    it('should return empty data array when no incidents match', async () => {
      mockDb.then
        .mockImplementationOnce(resolveWith([]))
        .mockImplementationOnce(resolveWith([{ count: 0 }]));

      const filters: IncidentFiltersDto = {
        page: 1,
        limit: 20,
        status: 'resolved',
      } as IncidentFiltersDto;
      const result = await service.findAll(filters);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findMyIncidents', () => {
    it('should return paginated incidents for the given reporter', async () => {
      mockDb.then
        .mockImplementationOnce(resolveWith([mockIncident]))
        .mockImplementationOnce(resolveWith([{ count: 1 }]));

      const filters: IncidentFiltersDto = { page: 1, limit: 20 } as IncidentFiltersDto;
      const result = await service.findMyIncidents('reporter-uuid-1', filters);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]!.reporterId).toBe('reporter-uuid-1');
    });

    it('should return empty data when reporter has no incidents', async () => {
      mockDb.then
        .mockImplementationOnce(resolveWith([]))
        .mockImplementationOnce(resolveWith([{ count: 0 }]));

      const filters: IncidentFiltersDto = { page: 1, limit: 20 } as IncidentFiltersDto;
      const result = await service.findMyIncidents('reporter-uuid-2', filters);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update an incident and return the updated row', async () => {
      const updated = { ...mockIncident, status: 'under_review' as const, adminNotes: 'Noted' };
      mockDb.then.mockImplementationOnce(resolveWith([updated]));

      const dto: UpdateIncidentDto = {
        status: 'under_review',
        adminNotes: 'Noted',
      } as UpdateIncidentDto;

      const result = await service.update('incident-uuid-1', 'admin-uuid-1', dto);

      expect(result.status).toBe('under_review');
      expect(result.adminNotes).toBe('Noted');
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('should set resolvedAt and resolvedBy when status is resolved', async () => {
      const resolvedAt = new Date();
      const updated = {
        ...mockIncident,
        status: 'resolved' as const,
        resolvedAt,
        resolvedBy: 'admin-uuid-1',
      };
      mockDb.then.mockImplementationOnce(resolveWith([updated]));

      const dto: UpdateIncidentDto = { status: 'resolved' } as UpdateIncidentDto;
      const result = await service.update('incident-uuid-1', 'admin-uuid-1', dto);

      expect(result.status).toBe('resolved');
      expect(result.resolvedAt).not.toBeNull();
      expect(result.resolvedBy).toBe('admin-uuid-1');

      // Verify the DB set call included resolvedAt and resolvedBy
      const setCall = mockDb.set.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(setCall).toHaveProperty('resolvedAt');
      expect(setCall).toHaveProperty('resolvedBy', 'admin-uuid-1');
    });

    it('should set resolvedAt and resolvedBy when status is dismissed', async () => {
      const resolvedAt = new Date();
      const updated = {
        ...mockIncident,
        status: 'dismissed' as const,
        resolvedAt,
        resolvedBy: 'admin-uuid-1',
      };
      mockDb.then.mockImplementationOnce(resolveWith([updated]));

      const dto: UpdateIncidentDto = { status: 'dismissed' } as UpdateIncidentDto;
      const result = await service.update('incident-uuid-1', 'admin-uuid-1', dto);

      expect(result.status).toBe('dismissed');
      expect(result.resolvedAt).not.toBeNull();
      expect(result.resolvedBy).toBe('admin-uuid-1');

      // Verify the DB set call included resolvedAt and resolvedBy
      const setCall = mockDb.set.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(setCall).toHaveProperty('resolvedAt');
      expect(setCall).toHaveProperty('resolvedBy', 'admin-uuid-1');
    });

    it('should clear resolved metadata when status moves back to under_review', async () => {
      const updated = {
        ...mockIncident,
        status: 'under_review' as const,
        resolvedAt: null,
        resolvedBy: null,
      };
      mockDb.then.mockImplementationOnce(resolveWith([updated]));

      const dto: UpdateIncidentDto = { status: 'under_review' } as UpdateIncidentDto;
      await service.update('incident-uuid-1', 'admin-uuid-1', dto);

      const setCall = mockDb.set.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(setCall).toHaveProperty('resolvedAt', null);
      expect(setCall).toHaveProperty('resolvedBy', null);
    });
  });
});
