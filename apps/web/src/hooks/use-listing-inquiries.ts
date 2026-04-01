import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '@/lib/query-keys';
import { listingInquiriesAPI } from '@/services/api';

export function useListingInquiriesReceived(filters?: {
  status?: string;
  offset?: number;
  limit?: number;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.market.listingInquiriesReceived(filters),
    queryFn: () => listingInquiriesAPI.getReceived(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useListingInquiriesSent(filters?: {
  status?: string;
  offset?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.market.listingInquiriesSent(filters),
    queryFn: () => listingInquiriesAPI.getSent(filters),
  });
}

export function useMarkListingInquiryRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => listingInquiriesAPI.markRead(id),
    onSuccess: () => {
      toast.success('تم تحديث حالة الاستفسار');
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.listingInquiries() });
    },
    onError: () => toast.error('تعذر تحديث حالة الاستفسار'),
  });
}

export function useMarkListingInquiryReplied() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      listingInquiriesAPI.reply(id, { message }),
    onSuccess: () => {
      toast.success('تم إرسال الرد وتحديث حالة الاستفسار');
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.listingInquiries() });
    },
    onError: () => toast.error('تعذر تحديث حالة الاستفسار'),
  });
}
