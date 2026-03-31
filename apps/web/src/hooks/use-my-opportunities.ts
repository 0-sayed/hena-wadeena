import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { investmentAPI } from '@/services/api';

export function useMyOpportunities() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['investment', 'opportunities', 'mine'] as const,
    queryFn: () => investmentAPI.getMine(),
    enabled: isAuthenticated,
  });
}
