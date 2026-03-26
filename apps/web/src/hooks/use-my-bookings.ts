import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { bookingsAPI } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

interface BookingFilters {
  status?: string;
  offset?: number;
  limit?: number;
}

export function useMyBookings(filters?: BookingFilters) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.bookings.mine(filters as Record<string, unknown>),
    queryFn: () => bookingsAPI.getMyBookings(filters),
    enabled: isAuthenticated,
  });
}
