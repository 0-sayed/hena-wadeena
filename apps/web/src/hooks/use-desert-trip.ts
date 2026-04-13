import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, desertTripsAPI } from '@/services/api';
import type { RegisterDesertTripRequest } from '@/services/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';

export function useDesertTrip(bookingId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.desertTrips.byBooking(bookingId ?? ''),
    queryFn: async () => {
      try {
        return await desertTripsAPI.getByBooking(bookingId!);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: isAuthenticated && !!bookingId,
  });
}

export function useRegisterDesertTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: RegisterDesertTripRequest }) =>
      desertTripsAPI.register(bookingId, body),
    onSuccess: (_data, { bookingId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.desertTrips.byBooking(bookingId),
      });
    },
  });
}

export function useCheckInDesertTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => desertTripsAPI.checkIn(bookingId),
    onSuccess: (_data, bookingId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.desertTrips.byBooking(bookingId),
      });
    },
  });
}
