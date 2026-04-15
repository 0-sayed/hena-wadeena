import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { apiFetch } from '@/services/api';
import type { BusinessEntry, Commodity, PaginatedResponse } from '@/services/api';

interface HeroStats {
  commoditiesCount: number;
  transportCount: number;
  investmentsCount: number;
}

async function fetchHeroStats(): Promise<HeroStats> {
  const [commodities, transport, investments] = await Promise.allSettled([
    apiFetch<Commodity[]>('/commodities'),
    apiFetch<PaginatedResponse<BusinessEntry>>('/businesses?category=transport&limit=1'),
    apiFetch<PaginatedResponse<Record<string, unknown>>>('/investments?limit=1'),
  ]);

  return {
    commoditiesCount: commodities.status === 'fulfilled' ? commodities.value.length : 0,
    transportCount: transport.status === 'fulfilled' ? transport.value.total : 0,
    investmentsCount: investments.status === 'fulfilled' ? investments.value.total : 0,
  };
}

export function useHeroStats() {
  return useQuery({
    queryKey: queryKeys.home.stats(),
    queryFn: fetchHeroStats,
    staleTime: 5 * 60 * 1000,
  });
}
