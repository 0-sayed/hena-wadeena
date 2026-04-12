import { describe, it, expect, vi, beforeEach } from 'vitest';

// All variables referenced directly in vi.mock factory return values must use
// vi.hoisted() so they are available when Vitest evaluates the factories
// (before module imports are resolved).

const mockInvalidate = vi.hoisted(() => vi.fn());
const mockGetByBooking = vi.hoisted(() => vi.fn());
const mockRegister = vi.hoisted(() => vi.fn());
const mockCheckIn = vi.hoisted(() => vi.fn());

// ApiError must also be hoisted: the hook uses `instanceof ApiError`, and the
// same class must be shared between the mock factory and the test assertions.
const mockUseAuth = vi.hoisted(() => vi.fn().mockReturnValue({ isAuthenticated: true }));

const MockApiError = vi.hoisted(() => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }
  return ApiError;
});

vi.mock('@/services/api', () => ({
  ApiError: MockApiError,
  desertTripsAPI: {
    getByBooking: mockGetByBooking,
    register: mockRegister,
    checkIn: mockCheckIn,
  },
}));

vi.mock('@/lib/query-keys', () => ({
  queryKeys: {
    desertTrips: {
      byBooking: (id: string) => ['desert-trips', id] as const,
    },
  },
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}));

// capturedQueryOptions / capturedMutationOptions are only assigned inside
// mockImplementation callbacks, never at factory evaluation time, so regular
// let declarations are safe here (no TDZ risk during factory setup).
let capturedQueryOptions: Record<string, unknown> = {};
let capturedMutationOptions: Record<string, unknown> = {};

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    capturedQueryOptions = options;
    return { data: undefined, isLoading: false };
  }),
  useMutation: vi.fn().mockImplementation((options: Record<string, unknown>) => {
    capturedMutationOptions = options;
    return { mutate: vi.fn() };
  }),
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: mockInvalidate }),
}));

import { useDesertTrip, useRegisterDesertTrip, useCheckInDesertTrip } from './use-desert-trip';

describe('useDesertTrip', () => {
  it('is disabled when bookingId is undefined', () => {
    useDesertTrip(undefined);
    expect(capturedQueryOptions.enabled).toBe(false);
  });

  it('is disabled when not authenticated', () => {
    mockUseAuth.mockReturnValueOnce({ isAuthenticated: false });
    useDesertTrip('b1');
    expect(capturedQueryOptions.enabled).toBe(false);
  });

  it('returns null when API throws 404', async () => {
    mockGetByBooking.mockRejectedValueOnce(new MockApiError(404, 'Not Found'));
    useDesertTrip('b1');
    const result = await (capturedQueryOptions.queryFn as () => Promise<unknown>)();
    expect(result).toBeNull();
  });

  it('returns trip data on success', async () => {
    const trip = { id: 't1', status: 'pending' };
    mockGetByBooking.mockResolvedValueOnce(trip);
    useDesertTrip('b1');
    const result = await (capturedQueryOptions.queryFn as () => Promise<unknown>)();
    expect(result).toEqual(trip);
  });

  it('rethrows non-404 errors', async () => {
    mockGetByBooking.mockRejectedValueOnce(new MockApiError(500, 'Server Error'));
    useDesertTrip('b1');
    await expect((capturedQueryOptions.queryFn as () => Promise<unknown>)()).rejects.toMatchObject({
      status: 500,
    });
  });
});

describe('useRegisterDesertTrip', () => {
  beforeEach(() => {
    mockInvalidate.mockClear();
  });

  it('calls desertTripsAPI.register with correct args', async () => {
    mockRegister.mockResolvedValueOnce({ id: 't1' });
    useRegisterDesertTrip();
    const vars = {
      bookingId: 'b1',
      body: {
        destinationName: 'Wadi',
        emergencyContact: '01012345678',
        expectedArrivalAt: '2026-05-01T10:00:00Z',
      },
    };
    await (capturedMutationOptions.mutationFn as (v: typeof vars) => Promise<unknown>)(vars);
    expect(mockRegister).toHaveBeenCalledWith('b1', vars.body);
  });

  it('invalidates desert-trip query key on success', async () => {
    useRegisterDesertTrip();
    const vars = { bookingId: 'b1', body: {} };
    await (capturedMutationOptions.onSuccess as (data: unknown, v: typeof vars) => Promise<void>)(
      {},
      vars,
    );
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['desert-trips', 'b1'] });
  });
});

describe('useCheckInDesertTrip', () => {
  beforeEach(() => {
    mockInvalidate.mockClear();
  });

  it('calls desertTripsAPI.checkIn with correct bookingId', async () => {
    mockCheckIn.mockResolvedValueOnce({ id: 't1' });
    useCheckInDesertTrip();
    await (capturedMutationOptions.mutationFn as (id: string) => Promise<unknown>)('b1');
    expect(mockCheckIn).toHaveBeenCalledWith('b1');
  });

  it('invalidates desert-trip query key on success', async () => {
    useCheckInDesertTrip();
    await (
      capturedMutationOptions.onSuccess as (data: unknown, bookingId: string) => Promise<void>
    )({}, 'b1');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['desert-trips', 'b1'] });
  });
});
