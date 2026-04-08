import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { benefitsAPI } from '@/services/api';

export function useBenefits() {
  return useQuery({
    queryKey: queryKeys.benefits.all(),
    queryFn: () => benefitsAPI.list(),
    staleTime: 10 * 60 * 1000, // 10 min — admin rarely updates these
  });
}
