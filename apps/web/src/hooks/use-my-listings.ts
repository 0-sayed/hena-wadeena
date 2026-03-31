import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { listingsAPI } from '@/services/api';

export function useMyListings() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['market', 'listings', 'mine'] as const,
    queryFn: () => listingsAPI.getMine(),
    enabled: isAuthenticated,
  });
}
