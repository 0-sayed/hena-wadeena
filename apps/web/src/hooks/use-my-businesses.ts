import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { businessesAPI } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

export function useMyBusinesses() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.market.businesses.mine(),
    queryFn: () => businessesAPI.getMine(),
    enabled: isAuthenticated,
  });
}
