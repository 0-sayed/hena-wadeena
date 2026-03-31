import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Calendar,
  Clock,
  Star,
  Users,
  Shield,
  AlertCircle,
  Loader2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePackage } from '@/hooks/use-packages';
import { useCreateBooking } from '@/hooks/use-bookings';
import { formatRating, piastresToEgp } from '@/lib/format';
import { Skeleton } from '@/components/motion/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { deductWalletBalance, getWalletSnapshot } from '@/lib/wallet-store';

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

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

  const totalPrice = pkg ? pkg.price * peopleCount : 0;
  const walletBalance = user ? getWalletSnapshot(user.id).wallet.balance : 0;
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

  const handleConfirm = () => {
    if (!pkg || !user) return;

    if (!canAfford) {
      toast.error('رصيد المحفظة غير كافٍ. اشحن المحفظة ثم أعد المحاولة.');
      setShowConfirm(false);
      void navigate('/wallet');
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
          try {
            deductWalletBalance(user.id, totalPrice, `حجز باقة سياحية: ${pkg.titleAr}`, {
              reference_id: pkg.id,
              reference_type: 'package_booking',
            });
          } catch (walletError: unknown) {
            toast.error(
              walletError instanceof Error
                ? walletError.message
                : 'تم إنشاء الحجز لكن تعذر تحديث المحفظة',
            );
            return;
          }

          toast.success('تم تأكيد الحجز وخصم قيمة الباقة من المحفظة بنجاح');
          void navigate('/bookings');
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحجز');
          setShowConfirm(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <section className="py-8 md:py-12">
          <div className="container px-4 max-w-3xl">
            <Skeleton h="h-96" className="rounded-2xl" />
          </div>
        </section>
      </Layout>
    );
  }

  if (error || !pkg) {
    return (
      <Layout>
        <div className="container py-20 flex flex-col items-center gap-4">
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
        <div className="container px-4 max-w-3xl">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-border/50 lg:order-2">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={pkg.guideProfileImage ?? '/placeholder.jpg'}
                    alt="مرشد"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{pkg.guideBioAr}</p>
                    <div className="flex items-center gap-1">
                      {pkg.guideRatingAvg != null && (
                        <>
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium text-sm">
                            {formatRating(pkg.guideRatingAvg)}
                          </span>
                        </>
                      )}
                      {pkg.guideLicenseVerified && (
                        <Badge className="h-5 text-[10px] bg-green-500/10 text-green-600 mr-2">
                          <Shield className="h-3 w-3 ml-1" />
                          مرخّص
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-bold text-lg">{pkg.titleAr}</h3>
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
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
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

            <Card className="border-border/50 lg:col-span-2 lg:order-1">
              <CardHeader>
                <CardTitle className="text-xl">تفاصيل الحجز</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">تاريخ الرحلة</Label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        value={bookingDate}
                        min={minDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">وقت البدء</Label>
                    <div className="relative">
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
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
                      <span className="text-xl font-bold w-8 text-center">{peopleCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPeopleCount((count) => Math.min(pkg.maxPeople, count + 1))}
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
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      rows={3}
                    />
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
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
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
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
            <Button onClick={handleConfirm} disabled={createBooking.isPending}>
              {createBooking.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              تأكيد الحجز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default GuideBookingPage;
