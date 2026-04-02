import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
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
import { bookingStatusLabels } from '@/lib/booking-status';
import { piastresToEgp } from '@/lib/format';
import { UserRole } from '@hena-wadeena/types';
import type { Booking } from '@/services/api';

const STATUS_TABS = [
  { key: undefined, label: 'الكل' },
  { key: 'pending', label: 'في الانتظار' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'in_progress', label: 'جاري' },
  { key: 'completed', label: 'مكتمل' },
  { key: 'cancelled', label: 'ملغى' },
] as const;

function todayCairo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

const BookingsPage = () => {
  const { user, direction } = useAuth();
  const isGuide = user?.role === UserRole.GUIDE;

  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, refetch } = useMyBookings(
    activeTab ? { status: activeTab } : undefined,
  );

  const bookings = data?.data ?? [];

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Confirm dialog state (for confirm/start/complete actions)
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    action: 'confirm' | 'start' | 'complete';
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
    const labels = {
      confirm: 'تم تأكيد الحجز',
      start: 'تم بدء الجولة',
      complete: 'تم إكمال الجولة',
    };
    mutation.mutate(id, {
      onSuccess: () => {
        toast.success(labels[action]);
        setActionTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'حدث خطأ');
      },
    });
  };

  const handleCancel = () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelMutation.mutate(
      { id: cancelTarget, cancelReason: cancelReason.trim() },
      {
        onSuccess: () => {
          toast.success('تم إلغاء الحجز');
          setCancelTarget(null);
          setCancelReason('');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'حدث خطأ');
        },
      },
    );
  };

  const today = todayCairo();

  const renderActions = (b: Booking) => {
    const isBookingDay = b.bookingDate === today;

    if (b.status === 'pending') {
      return isGuide ? (
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => setActionTarget({ id: b.id, action: 'confirm' })}>
            <CheckCircle className="h-4 w-4 ms-1" />
            قبول
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(b.id)}>
            <XCircle className="h-4 w-4 ms-1" />
            رفض
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="mt-4"
          onClick={() => setCancelTarget(b.id)}
        >
          <XCircle className="h-4 w-4 ms-1" />
          إلغاء
        </Button>
      );
    }

    if (b.status === 'confirmed') {
      return isGuide ? (
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            onClick={() => setActionTarget({ id: b.id, action: 'start' })}
            disabled={!isBookingDay}
            title={!isBookingDay ? 'يمكن بدء الجولة في يوم الحجز فقط' : ''}
          >
            <Play className="h-4 w-4 ms-1" />
            بدء الجولة
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(b.id)}>
            إلغاء
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="mt-4"
          onClick={() => setCancelTarget(b.id)}
        >
          إلغاء
        </Button>
      );
    }

    if (b.status === 'in_progress' && isGuide) {
      return (
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => setActionTarget({ id: b.id, action: 'complete' })}>
            <CheckCircle className="h-4 w-4 ms-1" />
            إكمال الجولة
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setCancelTarget(b.id)}>
            إلغاء
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Layout title="حجوزاتي">
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-3xl">
            <SR>
              <div className="flex items-center gap-4 mb-10">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">حجوزاتي</h1>
              </div>
            </SR>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {STATUS_TABS.map((tab) => (
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
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} h="h-32" className="rounded-2xl" />
                ))}
              </div>
            ) : isError ? (
              <SR>
                <div className="text-center py-12 space-y-4">
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                  <p className="text-muted-foreground text-lg">حدث خطأ أثناء تحميل الحجوزات</p>
                  <Button variant="outline" onClick={() => void refetch()}>
                    إعادة المحاولة
                  </Button>
                </div>
              </SR>
            ) : bookings.length === 0 ? (
              <SR>
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center space-y-4">
                    <p className="text-muted-foreground text-lg">
                      لا توجد حجوزات حتى الآن. ابدأ باستكشاف المرشدين السياحيين!
                    </p>
                    <Link to="/guides">
                      <Button variant="outline">تصفّح المرشدين</Button>
                    </Link>
                  </CardContent>
                </Card>
              </SR>
            ) : (
              <div className="space-y-5">
                {bookings.map((b, idx) => {
                  const statusInfo = bookingStatusLabels[b.status];
                  return (
                    <SR key={b.id} delay={idx * 60}>
                      <Card className="hover-lift rounded-2xl border-border/50">
                        <CardContent className="p-7">
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              {b.packageTitleAr && (
                                <h3 className="font-bold">{b.packageTitleAr}</h3>
                              )}
                              <p className="text-sm text-muted-foreground">
                                حجز #{b.id.slice(0, 8)}
                              </p>
                            </div>
                            {statusInfo && (
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                <Calendar className="h-4 w-4" />
                              </div>
                              {b.bookingDate}
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                <Clock className="h-4 w-4" />
                              </div>
                              {b.startTime.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              {b.peopleCount} أشخاص
                            </div>
                            <div className="font-bold text-primary text-start text-lg">
                              {piastresToEgp(b.totalPrice)}
                            </div>
                          </div>
                          {b.notes && (
                            <p className="text-sm text-muted-foreground mt-3 bg-muted/30 rounded-lg p-3">
                              {b.notes}
                            </p>
                          )}
                          {b.cancelReason && (
                            <p className="text-sm text-destructive mt-3 bg-destructive/5 rounded-lg p-3">
                              سبب الإلغاء: {b.cancelReason}
                            </p>
                          )}
                          {renderActions(b)}
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

      {/* Cancel Dialog */}
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
            <DialogTitle>إلغاء الحجز</DialogTitle>
            <DialogDescription>يرجى ذكر سبب الإلغاء</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">سبب الإلغاء (مطلوب)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="اكتب سبب الإلغاء..."
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
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 ms-2 animate-spin" />}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirm Dialog (confirm/start/complete) */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm" dir={direction}>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === 'confirm' && 'تأكيد الحجز'}
              {actionTarget?.action === 'start' && 'بدء الجولة'}
              {actionTarget?.action === 'complete' && 'إكمال الجولة'}
            </DialogTitle>
            <DialogDescription>
              {actionTarget?.action === 'confirm' && 'هل تريد قبول هذا الحجز؟'}
              {actionTarget?.action === 'start' && 'هل تريد بدء هذه الجولة الآن؟'}
              {actionTarget?.action === 'complete' && 'هل تريد تسجيل إكمال هذه الجولة؟'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              تراجع
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                confirmMutation.isPending || startMutation.isPending || completeMutation.isPending
              }
            >
              {(confirmMutation.isPending ||
                startMutation.isPending ||
                completeMutation.isPending) && <Loader2 className="h-4 w-4 ms-2 animate-spin" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BookingsPage;
