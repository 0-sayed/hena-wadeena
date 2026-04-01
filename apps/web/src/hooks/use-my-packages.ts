import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { myPackagesAPI } from '@/services/api';

export function useMyPackages(status?: 'active' | 'inactive') {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['guides', 'mine', 'packages', status, user?.id] as const,
    queryFn: () => myPackagesAPI.getAll(status ? { status } : undefined),
    enabled: isAuthenticated,
  });
}
