import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { notificationsAPI } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';

export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsAPI.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
