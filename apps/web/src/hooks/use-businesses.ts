import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { businessesAPI } from '@/services/api';

export function useBusinesses(filters?: {
  category?: string;
  district?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.businesses(filters),
    queryFn: () => businessesAPI.getAll(filters),
  });
}

export function useBusiness(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.market.business(id!),
    queryFn: () => businessesAPI.getById(id!),
    enabled: !!id,
  });
}
