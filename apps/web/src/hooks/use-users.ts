import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { usersAPI } from '@/services/api';

export function usePublicUsers(ids: string[]) {
  const normalizedIds = useMemo(() => [...new Set(ids.filter(Boolean))].sort(), [ids]);

  return useQuery({
    queryKey: queryKeys.users.publicProfiles(normalizedIds),
    queryFn: () => usersAPI.getPublicProfiles(normalizedIds),
    enabled: normalizedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    select: (profiles) =>
      Object.fromEntries(profiles.map((profile) => [profile.id, profile])) as Record<
        string,
        (typeof profiles)[number]
      >,
  });
}
