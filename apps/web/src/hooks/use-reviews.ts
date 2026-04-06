import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsAPI } from '@/services/api';
import { queryKeys } from '@/lib/query-keys';
import { usePaginatedQuery } from './use-paginated-query';
import { useAuth } from './use-auth';

/**
 * Fetches all of the current user's reviews (up to 200).
 * Returns a Set of bookingIds that have already been reviewed —
 * used by BookingsPage to gate the "Rate" button.
 *
 * Callers should default to `new Set()` on loading/error for safe degradation:
 * `const { data: reviewedBookingIds = new Set<string>() } = useMyReviewedBookingIds()`
 */
export function useMyReviewedBookingIds() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.reviews.mine(),
    queryFn: () => reviewsAPI.getMyReviews({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
    select: (data) => new Set(data.data.map((r) => r.bookingId)),
    enabled: isAuthenticated,
  });
}

/**
 * Paginated reviews for a guide profile page.
 * Uses the standard usePaginatedQuery + LoadMoreButton pattern.
 *
 * usePaginatedQuery passes { page, limit } (1-based page) while the
 * reviews API uses offset-based pagination. The queryFn wrapper below
 * converts page → offset = (page - 1) * limit.
 */
export function useGuideReviews(guideId: string) {
  return usePaginatedQuery({
    queryKey: queryKeys.reviews.guide(guideId),
    queryFn: ({ page, limit }) =>
      reviewsAPI.getGuideReviews(guideId, { offset: (page - 1) * limit, limit }),
    staleTime: 2 * 60 * 1000,
    enabled: !!guideId,
  });
}

/**
 * Mutation to submit a new review.
 * Pass guideId alongside the review body so we can invalidate the
 * guide's reviews list after submission.
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      guideId: _guideId,
      ...body
    }: {
      guideId: string;
      bookingId: string;
      rating: number;
      comment?: string;
    }) => reviewsAPI.createReview(body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.mine() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.guide(variables.guideId) });
    },
  });
}

/**
 * Mutation to mark a review as helpful.
 * Pass guideId so we can invalidate the guide's reviews list.
 */
export function useMarkHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, guideId: _guideId }: { reviewId: string; guideId: string }) =>
      reviewsAPI.markHelpful(reviewId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.guide(variables.guideId) });
    },
  });
}
