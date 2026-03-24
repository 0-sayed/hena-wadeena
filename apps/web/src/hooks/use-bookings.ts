import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsAPI } from '@/services/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@hena-wadeena/types';

const BOOKABLE_ROLES = [UserRole.TOURIST, UserRole.STUDENT, UserRole.INVESTOR, UserRole.RESIDENT];

export function useCanBook(): boolean {
  const { user, isAuthenticated } = useAuth();
  return isAuthenticated && !!user && BOOKABLE_ROLES.includes(user.role);
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookingsAPI.createBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
    },
  });
}

export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsAPI.confirmBooking(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
    },
  });
}

export function useStartBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsAPI.startBooking(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cancelReason }: { id: string; cancelReason: string }) =>
      bookingsAPI.cancelBooking(id, cancelReason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
    },
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingsAPI.completeBooking(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine() });
    },
  });
}
