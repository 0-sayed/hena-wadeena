import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { myGuideAPI } from '@/services/api';

export function useMyGuideProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['guides', 'mine', 'profile'] as const,
    queryFn: () => myGuideAPI.get(),
    enabled: isAuthenticated,
    retry: false,
  });
}
