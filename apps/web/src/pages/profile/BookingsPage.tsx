import { useState } from 'react';
import { Link } from 'react-router';
import {
  Calendar,
  Clock,
  Users,
  CalendarCheck,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  AlertCircle,
  Star,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FieldErrorText } from '@/components/ui/form-feedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useMyBookings } from '@/hooks/use-my-bookings';
import {
  useConfirmBooking,
  useStartBooking,
  useCancelBooking,
  useCompleteBooking,
} from '@/hooks/use-bookings';
import { useMyReviewedBookingIds, useCreateReview } from '@/hooks/use-reviews';
import { getBookingStatusLabels } from '@/lib/booking-status';
import { piastresToEgp } from '@/lib/format';
import { UserRole } from '@hena-wadeena/types';
import { ApiError, type Booking } from '@/services/api';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { useTranslation } from 'react-i18next';

type BookingAction = 'confirm' | 'start' | 'complete';
type ReviewFormErrors = {
  rating?: string;
  comment?: string;
};

function getStatusTabs(language: AppLanguage) {
  return [
    { key: undefined, label: t('bookings.tabs.all') },
    { key: 'pending', label: t('transactions.status.pending') },
    {
      key: 'confirmed',
      label: t('bookings.tabs.confirmed'),
    },
    {
      key: 'in_progress',
      label: t('bookings.tabs.in_progress'),
    },
    {
      key: 'completed',
      label: t('transactions.status.completed'),
    },
    {
      key: 'cancelled',
      label: t('bookings.tabs.cancelled'),
    },
  ] as const;
}

function formatPeopleCount(count: number, language: AppLanguage): string {
  if (language === 'en') {
    return `${count} ${count === 1 ? 'person' : 'people'}`;
  }

  return `${count} أشخاص`;
}

function getActionDialogCopy(
  action: BookingAction,
  language: AppLanguage,
): { title: string; description: string; success: string } {
  switch (action) {
    case 'confirm':
      return {
        title: t('bookings.dialogs.confirm.title'),
        description: t('bookings.dialogs.confirm.description'),
        success: t('bookings.dialogs.confirm.success'),
      };
    case 'start':
      return {
        title: t('bookings.dialogs.start.title'),
        description: t('bookings.dialogs.start.description'),
        success: t('bookings.dialogs.start.success'),
      };
    case 'complete':
      return {
        title: t('bookings.dialogs.complete.title'),
        description: t('bookings.dialogs.complete.description'),
        success: t('bookings.dialogs.complete.success'),
      };
  }
}

function todayCairo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

const BookingsPage = () => {
  const { user, direction, language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const isGuide = user?.role === UserRole.GUIDE;
  const statusTabs = getStatusTabs(appLanguage);
  const bookingStatusLabels = getBookingStatusLabels(appLanguage);
  const fallbackErrorMessage = t('bookings.fallbackError');

  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, refetch } = useMyBookings(
    activeTab ? { status: activeTab } : undefined,
  );

  const bookings = data?.data ?? [];
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    action: BookingAction;
  } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ bookingId: string; guideId: string } | null>(
    null,
  );
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAlreadySubmitted, setReviewAlreadySubmitted] = useState(false);
  const [reviewErrors, setReviewErrors] = useState<ReviewFormErrors>({});

  const confirmMutation = useConfirmBooking();
  const startMutation = useStartBooking();
  const cancelMutation = useCancelBooking();
  const completeMutation = useCompleteBooking();
  const { data: reviewedBookings = new Map<string, number>() } = useMyReviewedBookingIds();
  const createReviewMutation = useCreateReview();

  const handleAction = () => {
    if (!actionTarget) return;

    const { id, action } = actionTarget;
    const mutation =
      action === 'confirm'
        ? confirmMutation
        : action === 'start'
          ? startMutation
          : completeMutation;
    const actionCopy = getActionDialogCopy(action, appLanguage);

    mutation.mutate(id, {
      onSuccess: () => {
        toast.success(actionCopy.success);
        setActionTarget(null);
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : fallbackErrorMessage);
      },
    });
  };

  const handleCancel = () => {
    if (!cancelTarget || !cancelReason.trim()) return;

    cancelMutation.mutate(
      { id: cancelTarget, cancelReason: cancelReason.trim() },
      {
        onSuccess: () => {
          toast.success(
            t('bookings.toasts.cancelled'),
          );
          setCancelTarget(null);
          setCancelReason('');
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : fallbackErrorMessage);
        },
      },
    );
  };

  const handleReview = () => {
    if (!reviewTarget) return;

    const trimmedComment = reviewComment.trim();
    const nextErrors: ReviewFormErrors = {};

    if (reviewRating === 0) {
      nextErrors.rating = t('Please select a rating before submitting');
    }

    if (!trimmedComment) {
      nextErrors.comment = t('Please write a comment before submitting');
    }

    setReviewErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    createReviewMutation.mutate(
      {
        guideId: reviewTarget.guideId,
        bookingId: reviewTarget.bookingId,
        rating: reviewRating,
        comment: trimmedComment,
      },
      {
        onSuccess: () => {
          toast.success(
            t('bookings.dialogs.review.success'),
          );
          setReviewTarget(null);
          setReviewRating(0);
          setReviewComment('');
          setReviewAlreadySubmitted(false);
          setReviewErrors({});
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setReviewAlreadySubmitted(true);
          } else {
            toast.error(error instanceof Error ? error.message : fallbackErrorMessage);
          }
        },
      },
    );
  };

  const today = todayCairo();

  const renderActions = (booking: Booking) => {
    const isBookingDay = booking.bookingDate === today;

    if (booking.status === 'pending') {
      return isGuide ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => setActionTarget({ id: booking.id, action: 'confirm' })}>
            <CheckCircle className="ms-1 h-4 w-4" />
            {t('bookings.actions.accept')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(booking.id)}>
            <XCircle className="ms-1 h-4 w-4" />
            {t('bookings.actions.reject')}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="mt-4"
          onClick={() => setCancelTarget(booking.id)}
        >
          <XCircle className="ms-1 h-4 w-4" />
          {t('topup.cancelBtn')}
        </Button>
      );
    }

    if (booking.status === 'confirmed') {
      return isGuide ? (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={() => setActionTarget({ id: booking.id, action: 'start' })}
            disabled={!isBookingDay}
            title={
              !isBookingDay
                ? t('bookings.tooltips.startTimeOnly')
                : ''
            }
          >
            <Play className="ms-1 h-4 w-4" />
            {t('bookings.dialogs.start.title')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(booking.id)}>
            {t('topup.cancelBtn')}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="mt-4"
          onClick={() => setCancelTarget(booking.id)}
        >
          {t('topup.cancelBtn')}
        </Button>
      );
    }

    if (booking.status === 'in_progress' && isGuide) {
      return (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => setActionTarget({ id: booking.id, action: 'complete' })}>
            <CheckCircle className="ms-1 h-4 w-4" />
            {t('bookings.dialogs.complete.title')}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(booking.id)}>
            {t('topup.cancelBtn')}
          </Button>
        </div>
      );
    }

    if (booking.status === 'completed' && !isGuide) {
      const existingRating = reviewedBookings.get(booking.id);
      if (existingRating !== undefined) {
        return (
          <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            {pickLocalizedCopy(appLanguage, {
              ar: `تم التقييم ★${existingRating}`,
              en: `Reviewed ★${existingRating}`,
            })}
          </div>
        );
      }
      return (
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => setReviewTarget({ bookingId: booking.id, guideId: booking.guideId })}
        >
          <Star className="ms-1 h-4 w-4" />
          {t('bookings.dialogs.review.title')}
        </Button>
      );
    }

    return null;
  };

  return (
    <Layout title={t('My Bookings')}>
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-20">
          <GradientMesh />
          <div className="container relative max-w-3xl px-4">
            <SR>
              <div className="mb-10 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <CalendarCheck className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl font-bold md:text-4xl">
                  {t('bookings.title')}
                </h1>
              </div>
            </SR>

            <div className="mb-8 flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <Button
                  key={tab.key ?? 'all'}
                  variant={activeTab === tab.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} h="h-32" className="rounded-2xl" />
                ))}
              </div>
            ) : isError ? (
              <SR>
                <div className="space-y-4 py-12 text-center">
                  <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                  <p className="text-lg text-muted-foreground">
                    {t('bookings.loadError')}
                  </p>
                  <Button variant="outline" onClick={() => void refetch()}>
                    {t('bookings.retryBtn')}
                  </Button>
                </div>
              </SR>
            ) : bookings.length === 0 ? (
              <SR>
                <Card className="rounded-2xl">
                  <CardContent className="space-y-4 p-14 text-center">
                    <p className="text-lg text-muted-foreground">
                      {t('bookings.emptyState')}
                    </p>
                    <Link to="/guides">
                      <Button variant="outline">
                        {t('bookings.browseGuides')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </SR>
            ) : (
              <div className="space-y-5">
                {bookings.map((booking, index) => {
                  const statusInfo = bookingStatusLabels[booking.status];
                  const packageTitle =
                    pickLocalizedField(appLanguage, {
                      ar: booking.packageTitleAr,
                      en: booking.packageTitleEn,
                    }) ||
                    t('bookings.packageTitle');

                  return (
                    <SR key={booking.id} delay={index * 60}>
                      <Card className="hover-lift rounded-2xl border-border/50">
                        <CardContent className="p-7">
                          <div className="mb-5 flex items-start justify-between">
                            <div>
                              <h3 className="font-bold">{packageTitle}</h3>
                              <p className="text-sm text-muted-foreground">
                                {pickLocalizedCopy(appLanguage, {
                                  ar: `حجز #${booking.id.slice(0, 8)}`,
                                  en: `Booking #${booking.id.slice(0, 8)}`,
                                })}
                              </p>
                            </div>
                            {statusInfo && (
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                                <Calendar className="h-4 w-4" />
                              </div>
                              {booking.bookingDate}
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                                <Clock className="h-4 w-4" />
                              </div>
                              {booking.startTime.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                                <Users className="h-4 w-4" />
                              </div>
                              {formatPeopleCount(booking.peopleCount, appLanguage)}
                            </div>
                            <div className="text-start text-lg font-bold text-primary">
                              {piastresToEgp(booking.totalPrice)}
                            </div>
                          </div>
                          {booking.notes && (
                            <p className="mt-3 rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                              {booking.notes}
                            </p>
                          )}
                          {booking.cancelReason && (
                            <p className="mt-3 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
                              {t('bookings.cancellationReason')}{' '}
                              {booking.cancelReason}
                            </p>
                          )}
                          {renderActions(booking)}
                        </CardContent>
                      </Card>
                    </SR>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </PageTransition>

      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {t('bookings.dialogs.cancel.title')}
            </DialogTitle>
            <DialogDescription>
              {t('bookings.dialogs.cancel.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">
              {t('bookings.dialogs.cancel.label')}
            </Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={t('bookings.dialogs.cancel.placeholder')}
              maxLength={500}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
              disabled={cancelMutation.isPending}
            >
              {t('bookings.backBtn')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              {t('bookings.dialogs.cancel.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!actionTarget}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {actionTarget ? getActionDialogCopy(actionTarget.action, appLanguage).title : null}
            </DialogTitle>
            <DialogDescription>
              {actionTarget
                ? getActionDialogCopy(actionTarget.action, appLanguage).description
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              {t('bookings.backBtn')}
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                confirmMutation.isPending || startMutation.isPending || completeMutation.isPending
              }
            >
              {(confirmMutation.isPending ||
                startMutation.isPending ||
                completeMutation.isPending) && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              {t('bookings.confirmBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reviewTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setReviewRating(0);
            setReviewComment('');
            setReviewAlreadySubmitted(false);
            setReviewErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-md" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {t('bookings.dialogs.review.title')}
            </DialogTitle>
            <DialogDescription>
              {t('bookings.dialogs.review.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                {t('bookings.dialogs.review.rating')}
              </Label>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={pickLocalizedCopy(appLanguage, {
                      ar: `اختيار ${star} نجوم`,
                      en: `Select ${star} stars`,
                    })}
                    aria-pressed={star === reviewRating}
                    onClick={() => {
                      setReviewRating(star);
                      setReviewErrors((current) => ({ ...current, rating: undefined }));
                      setReviewAlreadySubmitted(false);
                    }}
                    className="rounded p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= reviewRating
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground hover:text-yellow-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <FieldErrorText id="review-rating-error" message={reviewErrors.rating} />
            </div>

            <div>
              <Label htmlFor="review-comment">
                {t('bookings.dialogs.review.comment')}
              </Label>
              <Textarea
                id="review-comment"
                value={reviewComment}
                aria-invalid={!!reviewErrors.comment}
                aria-describedby={reviewErrors.comment ? 'review-comment-error' : undefined}
                onChange={(e) => {
                  setReviewComment(e.target.value);
                  if (reviewErrors.comment && e.target.value.trim()) {
                    setReviewErrors((current) => ({ ...current, comment: undefined }));
                  }
                  setReviewAlreadySubmitted(false);
                }}
                placeholder={t('bookings.dialogs.review.placeholder')}
                maxLength={2000}
                rows={3}
                className="mt-2"
              />
              <FieldErrorText
                id="review-comment-error"
                message={reviewErrors.comment}
                className="mt-2"
              />
            </div>

            {reviewAlreadySubmitted && (
              <p className="text-sm font-medium text-destructive">
                {t('bookings.dialogs.review.alreadySubmitted')}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setReviewTarget(null);
                setReviewRating(0);
                setReviewComment('');
                setReviewAlreadySubmitted(false);
                setReviewErrors({});
              }}
              disabled={createReviewMutation.isPending}
            >
              {t('bookings.backBtn')}
            </Button>
            <Button onClick={handleReview} disabled={createReviewMutation.isPending}>
              {createReviewMutation.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              {t('bookings.dialogs.review.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BookingsPage;
