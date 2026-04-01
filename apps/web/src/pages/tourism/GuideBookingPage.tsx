import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  Loader2,
  Shield,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Skeleton } from '@/components/motion/Skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useCreateBooking } from '@/hooks/use-bookings';
import { usePackage } from '@/hooks/use-packages';
import { formatRating, piastresToEgp } from '@/lib/format';
import { deductWalletBalance, getWalletSnapshot, topUpWallet } from '@/lib/wallet-store';

const GuideBookingPage = () => {
  const navigate = useNavigate();
  const { packageId = '' } = useParams<{ packageId: string }>();
  const { user } = useAuth();

  const { data: pkg, isLoading, error } = usePackage(packageId);
  const createBooking = useCreateBooking();

  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const snapshot = await getWalletSnapshot(user.id);
        setWalletBalance(snapshot.wallet.balance);
      } catch {
        setWalletBalance(0);
      }
    })();
  }, [user]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

  const totalPrice = pkg ? pkg.price * peopleCount : 0;
  const canSubmit = bookingDate && startTime && peopleCount >= 1;
  const canAfford = walletBalance >= totalPrice;

  const bookingSummary = useMemo(
    () => ({
      packageTitle: pkg?.titleAr ?? '',
      totalPriceLabel: piastresToEgp(totalPrice),
      balanceLabel: piastresToEgp(walletBalance),
    }),
    [pkg?.titleAr, totalPrice, walletBalance],
  );

  const handleSubmit = () => {
    if (!canSubmit || !pkg) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (isProcessingRef.current) return;
    if (!pkg || !user) return;

    if (!canAfford) {
      toast.error('رصيد المحفظة غير كافٍ. اشحن المحفظة ثم أعد المحاولة.');
      setShowConfirm(false);
      void navigate('/wallet');
      return;
    }

    isProcessingRef.current = true;
    setWalletLoading(true);

    try {
      await deductWalletBalance(user.id, totalPrice, `حجز باقة سياحية: ${pkg.titleAr}`, {
        reference_id: pkg.id,
        reference_type: 'package_booking',
      });
    } catch (walletError: unknown) {
      isProcessingRef.current = false;
      setWalletLoading(false);
      toast.error(walletError instanceof Error ? walletError.message : 'تعذر تحديث رصيد المحفظة');
      setShowConfirm(false);
      return;
    }

    createBooking.mutate(
      {
        packageId: pkg.id,
        bookingDate,
        startTime,
        peopleCount,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          isProcessingRef.current = false;
          setWalletLoading(false);
          toast.success('تم تأكيد الحجز وخصم قيمة الباقة من المحفظة بنجاح');
          setShowConfirm(false);
          void navigate('/bookings');
        },
        onError: (err) => {
          isProcessingRef.current = false;
          void topUpWallet(user.id, totalPrice, `استرداد حجز باقة سياحية: ${pkg.titleAr}`, {
            reference_id: pkg.id,
            reference_type: 'package_booking_refund',
          })
            .then(() => {
              setWalletLoading(false);
              toast.error(
                err instanceof Error
                  ? `${err.message}. تم استرداد المبلغ للمحفظة.`
                  : 'فشل إنشاء الحجز. تم استرداد المبلغ للمحفظة.',
              );
            })
            .catch(() => {
              setWalletLoading(false);
              toast.error(
                err instanceof Error
                  ? `${err.message}. تعذر استرداد المبلغ للمحفظة، يرجى التواصل مع الدعم.`
                  : 'فشل إنشاء الحجز. تعذر استرداد المبلغ للمحفظة، يرجى التواصل مع الدعم.',
              );
            });
          setShowConfirm(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <section className="py-8 md:py-12">
          <div className="container max-w-3xl px-4">
            <Skeleton h="h-96" className="rounded-2xl" />
          </div>
        </section>
      </Layout>
    );
  }

  if (error || !pkg) {
    return (
      <Layout>
        <div className="container flex flex-col items-center gap-4 py-20">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg text-muted-foreground">تعذّر تحميل بيانات الباقة</p>
          <Button variant="outline" onClick={() => void navigate(-1)}>
            رجوع
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container max-w-3xl px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="ml-2 h-4 w-4" />
            رجوع
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="border-border/50 lg:order-2">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-4">
                  <img
                    src={pkg.guideProfileImage ?? '/placeholder.jpg'}
                    alt="مرشد"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{pkg.guideBioAr}</p>
                    <div className="flex items-center gap-1">
                      {pkg.guideRatingAvg != null && (
                        <>
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {formatRating(pkg.guideRatingAvg)}
                          </span>
                        </>
                      )}
                      {pkg.guideLicenseVerified && (
                        <Badge className="mr-2 h-5 bg-green-500/10 text-[10px] text-green-600">
                          <Shield className="ml-1 h-3 w-3" />
                          مرخّص
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-lg font-bold">{pkg.titleAr}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {pkg.durationHours} ساعة
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      حتى {pkg.maxPeople} أفراد
                    </span>
                  </div>
                  {pkg.includes && pkg.includes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pkg.includes.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>سعر الفرد</span>
                    <span>{piastresToEgp(pkg.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>عدد الأفراد</span>
                    <span>{peopleCount}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
                    <span>الإجمالي</span>
                    <span className="text-primary">{bookingSummary.totalPriceLabel}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4 text-primary" />
                    رصيد المحفظة الحالي
                  </div>
                  <p className="mt-2 text-xl font-bold text-foreground">
                    {bookingSummary.balanceLabel}
                  </p>
                  {!canAfford && (
                    <p className="mt-2 text-sm text-destructive">
                      الرصيد الحالي غير كافٍ لتأكيد هذا الحجز.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 lg:order-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">تفاصيل الحجز</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">تاريخ الرحلة</Label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        value={bookingDate}
                        min={minDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">وقت البدء</Label>
                    <div className="relative">
                      <Clock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="time"
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>عدد الأفراد</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPeopleCount((count) => Math.max(1, count - 1))}
                        disabled={peopleCount <= 1}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-xl font-bold">{peopleCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setPeopleCount((count) => Math.min(pkg.maxPeople, count + 1))
                        }
                        disabled={peopleCount >= pkg.maxPeople}
                      >
                        +
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        (الحد الأقصى {pkg.maxPeople})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات إضافية</Label>
                    <Textarea
                      id="notes"
                      placeholder="أخبرنا عن توقعاتك للرحلة..."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      maxLength={1000}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
                    <span className="text-muted-foreground">إجمالي التكلفة</span>
                    <span className="text-2xl font-bold text-primary">
                      {bookingSummary.totalPriceLabel}
                    </span>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!canSubmit}>
                    مراجعة الحجز
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحجز</DialogTitle>
            <DialogDescription>يرجى مراجعة تفاصيل الحجز قبل التأكيد</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الباقة</span>
              <span className="font-medium">{bookingSummary.packageTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التاريخ</span>
              <span>{bookingDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">وقت البدء</span>
              <span>{startTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">عدد الأفراد</span>
              <span>{peopleCount}</span>
            </div>
            {notes && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ملاحظات</span>
                <span className="max-w-[200px] text-left">{notes}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الرصيد الحالي</span>
              <span>{bookingSummary.balanceLabel}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>الإجمالي</span>
              <span className="text-primary">{bookingSummary.totalPriceLabel}</span>
            </div>
            {!canAfford && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                الرصيد الحالي غير كافٍ. سيتم تحويلك إلى المحفظة لشحن الرصيد.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={createBooking.isPending}
            >
              تعديل
            </Button>
            <Button
              onClick={() => void handleConfirm()}
              disabled={createBooking.isPending || walletLoading}
            >
              {(createBooking.isPending || walletLoading) && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              تأكيد الحجز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default GuideBookingPage;
