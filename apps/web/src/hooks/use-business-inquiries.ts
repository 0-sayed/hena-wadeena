import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { businessInquiriesAPI } from '@/services/api';

export function useBusinessInquiriesReceived(
  filters?: {
    status?: string;
    offset?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.market.businessInquiriesReceived(filters),
    queryFn: () => businessInquiriesAPI.getReceived(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useBusinessInquiriesSent(filters?: {
  status?: string;
  offset?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.businessInquiriesSent(filters),
    queryFn: () => businessInquiriesAPI.getSent(filters),
  });
}
