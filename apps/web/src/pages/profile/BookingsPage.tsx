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
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { getBookingStatusLabels } from '@/lib/booking-status';
import { piastresToEgp } from '@/lib/format';
import { UserRole } from '@hena-wadeena/types';
import type { Booking } from '@/services/api';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';

type BookingAction = 'confirm' | 'start' | 'complete';

function getStatusTabs(language: AppLanguage) {
  return [
    { key: undefined, label: pickLocalizedCopy(language, { ar: 'الكل', en: 'All' }) },
    { key: 'pending', label: pickLocalizedCopy(language, { ar: 'في الانتظار', en: 'Pending' }) },
    {
      key: 'confirmed',
      label: pickLocalizedCopy(language, { ar: 'مؤكد', en: 'Confirmed' }),
    },
    {
      key: 'in_progress',
      label: pickLocalizedCopy(language, { ar: 'جاري', en: 'In progress' }),
    },
    {
      key: 'completed',
      label: pickLocalizedCopy(language, { ar: 'مكتمل', en: 'Completed' }),
    },
    {
      key: 'cancelled',
      label: pickLocalizedCopy(language, { ar: 'ملغى', en: 'Cancelled' }),
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
        title: pickLocalizedCopy(language, { ar: 'تأكيد الحجز', en: 'Confirm booking' }),
        description: pickLocalizedCopy(language, {
          ar: 'هل تريد قبول هذا الحجز؟',
          en: 'Do you want to accept this booking?',
        }),
        success: pickLocalizedCopy(language, {
          ar: 'تم تأكيد الحجز',
          en: 'Booking confirmed',
        }),
      };
    case 'start':
      return {
        title: pickLocalizedCopy(language, { ar: 'بدء الجولة', en: 'Start tour' }),
        description: pickLocalizedCopy(language, {
          ar: 'هل تريد بدء هذه الجولة الآن؟',
          en: 'Do you want to start this tour now?',
        }),
        success: pickLocalizedCopy(language, {
          ar: 'تم بدء الجولة',
          en: 'Tour started',
        }),
      };
    case 'complete':
      return {
        title: pickLocalizedCopy(language, { ar: 'إكمال الجولة', en: 'Complete tour' }),
        description: pickLocalizedCopy(language, {
          ar: 'هل تريد تسجيل إكمال هذه الجولة؟',
          en: 'Do you want to mark this tour as completed?',
        }),
        success: pickLocalizedCopy(language, {
          ar: 'تم إكمال الجولة',
          en: 'Tour completed',
        }),
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
  const fallbackErrorMessage = pickLocalizedCopy(appLanguage, {
    ar: 'حدث خطأ',
    en: 'Something went wrong',
  });

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

  const confirmMutation = useConfirmBooking();
  const startMutation = useStartBooking();
  const cancelMutation = useCancelBooking();
  const completeMutation = useCompleteBooking();

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
            pickLocalizedCopy(appLanguage, {
              ar: 'تم إلغاء الحجز',
              en: 'Booking cancelled',
            }),
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

  const today = todayCairo();

  const renderActions = (booking: Booking) => {
    const isBookingDay = booking.bookingDate === today;

    if (booking.status === 'pending') {
      return isGuide ? (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => setActionTarget({ id: booking.id, action: 'confirm' })}>
            <CheckCircle className="ms-1 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'قبول',
              en: 'Accept',
            })}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(booking.id)}>
            <XCircle className="ms-1 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'رفض',
              en: 'Reject',
            })}
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
          {pickLocalizedCopy(appLanguage, {
            ar: 'إلغاء',
            en: 'Cancel',
          })}
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
                ? pickLocalizedCopy(appLanguage, {
                    ar: 'يمكن بدء الجولة في يوم الحجز فقط',
                    en: 'The tour can only be started on the booking day',
                  })
                : ''
            }
          >
            <Play className="ms-1 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'بدء الجولة',
              en: 'Start tour',
            })}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(booking.id)}>
            {pickLocalizedCopy(appLanguage, {
              ar: 'إلغاء',
              en: 'Cancel',
            })}
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="mt-4"
          onClick={() => setCancelTarget(booking.id)}
        >
          {pickLocalizedCopy(appLanguage, {
            ar: 'إلغاء',
            en: 'Cancel',
          })}
        </Button>
      );
    }

    if (booking.status === 'in_progress' && isGuide) {
      return (
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => setActionTarget({ id: booking.id, action: 'complete' })}>
            <CheckCircle className="ms-1 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'إكمال الجولة',
              en: 'Complete tour',
            })}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(booking.id)}>
            {pickLocalizedCopy(appLanguage, {
              ar: 'إلغاء',
              en: 'Cancel',
            })}
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout>
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
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'حجوزاتي',
                    en: 'My bookings',
                  })}
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
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'حدث خطأ أثناء تحميل الحجوزات',
                      en: 'There was an error loading your bookings',
                    })}
                  </p>
                  <Button variant="outline" onClick={() => void refetch()}>
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'إعادة المحاولة',
                      en: 'Try again',
                    })}
                  </Button>
                </div>
              </SR>
            ) : bookings.length === 0 ? (
              <SR>
                <Card className="rounded-2xl">
                  <CardContent className="space-y-4 p-14 text-center">
                    <p className="text-lg text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'لا توجد حجوزات حتى الآن. ابدأ باستكشاف المرشدين السياحيين!',
                        en: 'No bookings yet. Start exploring tour guides!',
                      })}
                    </p>
                    <Link to="/guides">
                      <Button variant="outline">
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تصفّح المرشدين',
                          en: 'Browse guides',
                        })}
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
                    pickLocalizedCopy(appLanguage, {
                      ar: 'باقة سياحية',
                      en: 'Tour package',
                    });

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
                              {pickLocalizedCopy(appLanguage, {
                                ar: 'سبب الإلغاء:',
                                en: 'Cancellation reason:',
                              })}{' '}
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
              {pickLocalizedCopy(appLanguage, {
                ar: 'إلغاء الحجز',
                en: 'Cancel booking',
              })}
            </DialogTitle>
            <DialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'يرجى ذكر سبب الإلغاء',
                en: 'Please share the cancellation reason',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">
              {pickLocalizedCopy(appLanguage, {
                ar: 'سبب الإلغاء (مطلوب)',
                en: 'Cancellation reason (Required)',
              })}
            </Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={pickLocalizedCopy(appLanguage, {
                ar: 'اكتب سبب الإلغاء...',
                en: 'Write the cancellation reason...',
              })}
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
              {pickLocalizedCopy(appLanguage, {
                ar: 'تراجع',
                en: 'Back',
              })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              {pickLocalizedCopy(appLanguage, {
                ar: 'تأكيد الإلغاء',
                en: 'Confirm cancellation',
              })}
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
              {pickLocalizedCopy(appLanguage, {
                ar: 'تراجع',
                en: 'Back',
              })}
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                confirmMutation.isPending || startMutation.isPending || completeMutation.isPending
              }
            >
              {(confirmMutation.isPending ||
                startMutation.isPending ||
                completeMutation.isPending) && (
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              )}
              {pickLocalizedCopy(appLanguage, {
                ar: 'تأكيد',
                en: 'Confirm',
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BookingsPage;
