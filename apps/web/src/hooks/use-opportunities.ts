import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { investmentAPI } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

export function useOpportunities() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.investment.opportunities(),
    queryFn: () => investmentAPI.getOpportunities(),
    enabled: isAuthenticated,
  });
}
