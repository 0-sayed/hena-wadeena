import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { guidesAPI } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

export function useMyBookings() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.bookings.mine(),
    queryFn: () => guidesAPI.getMyBookings(),
    enabled: isAuthenticated,
  });
}
