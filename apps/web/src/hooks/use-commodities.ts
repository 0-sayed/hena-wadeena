import { useQuery } from '@tanstack/react-query';
import type { CommodityCategory } from '@hena-wadeena/types';
import { commoditiesAPI } from '@/services/api';

export function useCommodities(category?: string) {
  return useQuery({
    queryKey: ['market', 'commodities', category] as const,
    queryFn: () =>
      commoditiesAPI.getAll(
        category ? { category: category as CommodityCategory } : undefined,
      ),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCommodity(id: string | undefined) {
  return useQuery({
    queryKey: id ? (['market', 'commodities', id] as const) : (['market', 'commodities', 'missing-id'] as const),
    queryFn: () => commoditiesAPI.getById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}
