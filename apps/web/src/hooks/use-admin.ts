import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@hena-wadeena/types';
import { toast } from 'sonner';

import { queryKeys } from '@/lib/query-keys';
import {
  adminAPI,
  aiKnowledgeAPI,
  type AiCuratedKnowledgeComposeRequest,
  type AiCuratedKnowledgeFeedRequest,
  type AiKnowledgeUploadRequest,
  type AdminBookingFilters,
  type AdminGuideFilters,
  type AdminKycFilters,
  type AdminListingFilters,
  type AdminUserFilters,
} from '@/services/api';

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: adminAPI.getStats,
    staleTime: 30 * 1000,
  });
}

export function useAdminUsers(filters?: AdminUserFilters) {
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => adminAPI.getUsers(filters),
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.user(id ?? ''),
    queryFn: () => adminAPI.getUser(id!),
    enabled: !!id,
  });
}

export function useAdminKyc(filters?: AdminKycFilters) {
  return useQuery({
    queryKey: queryKeys.admin.kyc(filters),
    queryFn: () => adminAPI.getKycSubmissions(filters),
  });
}

export function useAdminPendingListings(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingListings(filters),
    queryFn: () => adminAPI.getPendingListings(filters),
  });
}

export function useAdminListings(filters?: AdminListingFilters) {
  return useQuery({
    queryKey: queryKeys.admin.listings(filters),
    queryFn: () => adminAPI.getListings(filters),
  });
}

export function useAdminPendingBusinesses(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingBusinesses(filters),
    queryFn: () => adminAPI.getPendingBusinesses(filters),
  });
}

export function useAdminGuides(filters?: AdminGuideFilters) {
  return useQuery({
    queryKey: queryKeys.admin.guides(filters),
    queryFn: () => adminAPI.getGuides(filters),
  });
}

export function useAdminBookings(filters?: AdminBookingFilters) {
  return useQuery({
    queryKey: queryKeys.admin.bookings(filters),
    queryFn: () => adminAPI.getBookings(filters),
  });
}

export function useAdminPendingPois(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.admin.pendingPois(filters),
    queryFn: () => adminAPI.getPendingPois(filters),
  });
}

export function useAdminAiDocuments(filters?: {
  page?: number;
  per_page?: number;
  status?: string;
  language?: string;
  tags?: string;
}) {
  return useQuery({
    queryKey: queryKeys.admin.aiDocuments(filters),
    queryFn: () => aiKnowledgeAPI.listDocuments(filters),
  });
}

export function useAdminAiBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.aiBatch(batchId ?? ''),
    queryFn: () => aiKnowledgeAPI.getBatchStatus(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'completed_with_errors' || status === 'failed'
        ? false
        : 1500;
    },
  });
}

export function useUploadAdminAiDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AiKnowledgeUploadRequest) => aiKnowledgeAPI.uploadDocuments(body),
    onSuccess: () => {
      toast.success('تم إرسال ملفات PDF إلى قاعدة معرفة الذكاء الاصطناعي');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'documents'] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'فشل رفع ملفات PDF'),
  });
}

export function useDeleteAdminAiDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => aiKnowledgeAPI.deleteDocument(docId),
    onSuccess: () => {
      toast.success('تم حذف ملف PDF من قاعدة المعرفة');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'documents'] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'فشل حذف ملف PDF'),
  });
}

export function useComposeAdminAiCuratedText() {
  return useMutation({
    mutationFn: (body: AiCuratedKnowledgeComposeRequest) => aiKnowledgeAPI.composeCuratedText(body),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Failed to prepare curated knowledge'),
  });
}

export function useFeedAdminAiCuratedText() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AiCuratedKnowledgeFeedRequest) => aiKnowledgeAPI.feedCuratedText(body),
    onSuccess: (response) => {
      const hasFailures = response.failed_entries > 0;
      toast.success(
        hasFailures
          ? `Fed ${response.indexed_entries} sections with ${response.failed_entries} failure(s)`
          : `Fed ${response.indexed_entries} curated sections to the chatbot`,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'documents'] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Failed to feed the chatbot'),
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => adminAPI.changeUserRole(id, role),
    onSuccess: () => {
      toast.success('تم تغيير الدور بنجاح');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل تغيير الدور'),
  });
}

export function useChangeUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      adminAPI.changeUserStatus(id, status, reason),
    onSuccess: () => {
      toast.success('تم تحديث حالة المستخدم');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAPI.resetUserPassword(id),
    onSuccess: (_, id) => {
      toast.success('تمت إعادة تعيين كلمة المرور بنجاح');
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(id) });
    },
    onError: () => toast.error('فشل في إعادة تعيين كلمة المرور'),
  });
}

export function useReviewKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      notes?: string;
    }) => adminAPI.reviewKyc(id, status, notes),
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'تم قبول المستند' : 'تم رفض المستند');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل مراجعة المستند'),
  });
}

export function useVerifyListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, notes }: { id: string; approved: boolean; notes?: string }) =>
      adminAPI.verifyListing(id, approved, notes),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'تم قبول الإعلان' : 'تم رفض الإعلان');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل مراجعة الإعلان'),
  });
}

export function useVerifyBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approved, reason }: { id: string; approved: boolean; reason?: string }) =>
      adminAPI.verifyBusiness(id, approved, reason),
    onSuccess: (_, { approved }) => {
      toast.success(approved ? 'تم قبول النشاط التجاري' : 'تم رفض النشاط التجاري');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل مراجعة النشاط التجاري'),
  });
}

export function useSetGuideStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminAPI.setGuideStatus(id, active),
    onSuccess: () => {
      toast.success('تم تحديث حالة المرشد');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'guides'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل تحديث حالة المرشد'),
  });
}

export function useVerifyGuideLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      adminAPI.verifyGuideLicense(id, verified),
    onSuccess: () => {
      toast.success('تم تحديث حالة الترخيص');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'guides'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل تحديث حالة الترخيص'),
  });
}

export function useAdminCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminAPI.cancelBooking(id, reason),
    onSuccess: () => {
      toast.success('تم إلغاء الحجز');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل إلغاء الحجز'),
  });
}

export function useApprovePoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAPI.approvePoi(id),
    onSuccess: () => {
      toast.success('تم قبول نقطة الاهتمام');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل قبول نقطة الاهتمام'),
  });
}

export function useRejectPoi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminAPI.rejectPoi(id, reason),
    onSuccess: () => {
      toast.success('تم رفض نقطة الاهتمام');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pois'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('فشل رفض نقطة الاهتمام'),
  });
}
