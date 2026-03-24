import { useState } from 'react';
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
import { piastresToEgp, formatRating } from '@/lib/format';
import { Skeleton } from '@/components/motion/Skeleton';

const GuideBookingPage = () => {
  const navigate = useNavigate();
  const { packageId = '' } = useParams<{ packageId: string }>();

  const { data: pkg, isLoading, error } = usePackage(packageId);
  const createBooking = useCreateBooking();

  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Tomorrow as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toLocaleDateString('en-CA');

  const totalPrice = pkg ? pkg.price * peopleCount : 0;

  const canSubmit = bookingDate && startTime && peopleCount >= 1;

  const handleSubmit = () => {
    if (!canSubmit || !pkg) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (!pkg) return;
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
          toast.success('تم إرسال طلب الحجز بنجاح! سيتواصل معك المرشد قريباً');
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
            {/* Sidebar: Package + Guide info */}
            <Card className="border-border/50 lg:order-2">
              <CardContent className="p-6 space-y-4">
                {/* Guide info */}
                <div className="flex items-center gap-4">
                  <img
                    src={pkg.guideProfileImage ?? '/placeholder.jpg'}
                    alt="مرشد"
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {pkg.guideBioAr?.slice(0, 40)}
                    </p>
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

                {/* Package info */}
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

                {/* Price */}
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
                    <span className="text-primary">{piastresToEgp(totalPrice)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="border-border/50 lg:col-span-2 lg:order-1">
              <CardHeader>
                <CardTitle className="text-xl">تفاصيل الحجز</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Date */}
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

                  {/* Start Time */}
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

                  {/* People Count */}
                  <div className="space-y-2">
                    <Label>عدد الأفراد</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPeopleCount((c) => Math.max(1, c - 1))}
                        disabled={peopleCount <= 1}
                      >
                        -
                      </Button>
                      <span className="text-xl font-bold w-8 text-center">{peopleCount}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPeopleCount((c) => Math.min(pkg.maxPeople, c + 1))}
                        disabled={peopleCount >= pkg.maxPeople}
                      >
                        +
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        (الحد الأقصى {pkg.maxPeople})
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
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

                  {/* Total */}
                  <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                    <span className="text-muted-foreground">إجمالي التكلفة</span>
                    <span className="text-2xl font-bold text-primary">
                      {piastresToEgp(totalPrice)}
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

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحجز</DialogTitle>
            <DialogDescription>يرجى مراجعة تفاصيل الحجز قبل التأكيد</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الباقة</span>
              <span className="font-medium">{pkg?.titleAr}</span>
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
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
              <span>الإجمالي</span>
              <span className="text-primary">{piastresToEgp(totalPrice)}</span>
            </div>
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
