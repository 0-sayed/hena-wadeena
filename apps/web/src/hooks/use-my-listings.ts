import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { listingsAPI } from '@/services/api';

export function useMyListings() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['market', 'listings', 'mine', user?.id] as const,
    queryFn: () => listingsAPI.getMine(),
    enabled: isAuthenticated,
  });
}
