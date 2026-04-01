import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { myGuideAPI } from '@/services/api';

export function useMyGuideProfile() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['guides', 'mine', 'profile', user?.id] as const,
    queryFn: () => myGuideAPI.get(),
    enabled: isAuthenticated,
    retry: false,
  });
}
