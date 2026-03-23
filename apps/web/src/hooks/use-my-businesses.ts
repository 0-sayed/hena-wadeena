import { useQuery } from '@tanstack/react-query';
import { businessesAPI } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

export function useMyBusinesses() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['market', 'businesses', 'mine'] as const,
    queryFn: () => businessesAPI.getMine(),
    enabled: isAuthenticated,
  });
}
