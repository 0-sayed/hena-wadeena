import { useQuery } from '@tanstack/react-query';
import { NvDistrict, PriceType } from '@hena-wadeena/types';
import { queryKeys } from '@/lib/query-keys';
import { commoditiesAPI } from '@/services/api';

export function usePriceHistory(
  commodityId: string | undefined,
  params?: { period?: '7d' | '30d' | '90d' | '1y'; region?: NvDistrict; price_type?: PriceType },
) {
  return useQuery({
    queryKey: queryKeys.market.priceHistory(commodityId ?? '', params),
    queryFn: () => commoditiesAPI.getPriceHistory(commodityId!, params),
    enabled: !!commodityId,
    staleTime: 5 * 60 * 1000,
  });
}
