import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, CalendarCheck, Coins, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyGuideProfile } from '@/hooks/use-my-guide-profile';
import { useMyPackages } from '@/hooks/use-my-packages';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { myGuideAPI, myPackagesAPI, bookingsAPI } from '@/services/api';
import { formatPrice } from '@/lib/format';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';

type GuideFormState = {
  licenseNumber: string;
  basePriceEgp: string;
  bioAr: string;
  languages: string;
  specialties: string;
  areasOfOperation: string;
};

type PackageFormState = {
  id?: string;
  titleAr: string;
  description: string;
  durationHours: string;
  maxPeople: string;
  priceEgp: string;
  includes: string;
};

const emptyPackageForm: PackageFormState = {
  titleAr: '',
  description: '',
  durationHours: '',
  maxPeople: '',
  priceEgp: '',
  includes: '',
};

function splitCommaValues(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function GuideDashboard() {
  const queryClient = useQueryClient();
  const guideProfileQuery = useMyGuideProfile();
  const packagesQuery = useMyPackages();
  const bookingsQuery = useMyBookings();

  const [guideForm, setGuideForm] = useState<GuideFormState>({
    licenseNumber: '',
    basePriceEgp: '',
    bioAr: '',
    languages: '',
    specialties: '',
    areasOfOperation: '',
  });
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm);
  const [savingGuide, setSavingGuide] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  const guideProfile = guideProfileQuery.data;
  const myPackages = useMemo(() => packagesQuery.data?.data ?? [], [packagesQuery.data?.data]);
  const myBookings = useMemo(() => bookingsQuery.data?.data ?? [], [bookingsQuery.data?.data]);

  useEffect(() => {
    if (!guideProfile) return;
    setGuideForm({
      licenseNumber: guideProfile.licenseNumber,
      basePriceEgp: String(guideProfile.basePrice / 100),
      bioAr: guideProfile.bioAr ?? '',
      languages: guideProfile.languages.join(', '),
      specialties: guideProfile.specialties.join(', '),
      areasOfOperation: guideProfile.areasOfOperation.join(', '),
    });
  }, [guideProfile]);

  const stats = useMemo(() => {
    const completedBookings = myBookings.filter((booking) => booking.status === 'completed');
    return {
      packages: myPackages.length,
      pendingBookings: myBookings.filter((booking) => booking.status === 'pending').length,
      activeBookings: myBookings.filter((booking) =>
        ['confirmed', 'in_progress'].includes(booking.status),
      ).length,
      earnings: completedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
    };
  }, [myBookings, myPackages]);

  const refreshGuideData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['guides', 'mine', 'profile'] }),
      queryClient.invalidateQueries({ queryKey: ['guides', 'mine', 'packages'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] }),
    ]);
  };

  const handleSaveGuide = async () => {
    const basePrice = parseEgpInputToPiasters(guideForm.basePriceEgp);
    if (!guideForm.licenseNumber.trim()) {
      toast.error('رقم الترخيص مطلوب');
      return;
    }
    if (basePrice == null) {
      toast.error('أدخل سعراً صحيحاً لليوم');
      return;
    }

    setSavingGuide(true);
    try {
      const payload = {
        licenseNumber: guideForm.licenseNumber.trim(),
        basePrice,
        bioAr: guideForm.bioAr.trim() || undefined,
        languages: splitCommaValues(guideForm.languages),
        specialties: splitCommaValues(guideForm.specialties),
        areasOfOperation: splitCommaValues(guideForm.areasOfOperation),
      };

      if (guideProfile) {
        await myGuideAPI.update(payload);
      } else {
        await myGuideAPI.create(payload);
      }

      await refreshGuideData();
      toast.success(guideProfile ? 'تم تحديث ملف المرشد' : 'تم إنشاء ملف المرشد');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ ملف المرشد';
      toast.error(message);
    } finally {
      setSavingGuide(false);
    }
  };

  const handleSavePackage = async () => {
    const price = parseEgpInputToPiasters(packageForm.priceEgp);
    const durationHours = Number(packageForm.durationHours);
    const maxPeople = Number(packageForm.maxPeople);

    if (!packageForm.titleAr.trim()) {
      toast.error('عنوان الباقة مطلوب');
      return;
    }
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      toast.error('عدد الساعات غير صحيح');
      return;
    }
    if (!Number.isFinite(maxPeople) || maxPeople <= 0) {
      toast.error('العدد الأقصى للأشخاص غير صحيح');
      return;
    }
    if (price == null) {
      toast.error('سعر الباقة غير صحيح');
      return;
    }

    setSavingPackage(true);
    try {
      const payload = {
        titleAr: packageForm.titleAr.trim(),
        description: packageForm.description.trim() || undefined,
        durationHours,
        maxPeople,
        price,
        includes: splitCommaValues(packageForm.includes),
      };

      if (packageForm.id) {
        await myPackagesAPI.update(packageForm.id, payload);
      } else {
        await myPackagesAPI.create(payload);
      }

      setPackageForm(emptyPackageForm);
      await refreshGuideData();
      toast.success(packageForm.id ? 'تم تحديث الباقة' : 'تمت إضافة الباقة');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ الباقة';
      toast.error(message);
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      await myPackagesAPI.remove(id);
      await refreshGuideData();
      if (packageForm.id === id) {
        setPackageForm(emptyPackageForm);
      }
      toast.success('تم حذف الباقة');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف الباقة';
      toast.error(message);
    }
  };

  const handleBookingAction = async (
    bookingId: string,
    action: 'confirm' | 'start' | 'complete' | 'cancel',
  ) => {
    setProcessingBookingId(bookingId);
    try {
      if (action === 'confirm') await bookingsAPI.confirmBooking(bookingId);
      if (action === 'start') await bookingsAPI.startBooking(bookingId);
      if (action === 'complete') await bookingsAPI.completeBooking(bookingId);
      if (action === 'cancel') await bookingsAPI.cancelBooking(bookingId, 'تم الإلغاء من قبل المرشد');
      await refreshGuideData();
      toast.success('تم تحديث حالة الحجز');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تحديث الحجز';
      toast.error(message);
    } finally {
      setProcessingBookingId(null);
    }
  };

  const isLoading =
    guideProfileQuery.isLoading || packagesQuery.isLoading || bookingsQuery.isLoading;

  return (
    <DashboardShell
      icon={MapPinned}
      title="لوحة المرشد"
      subtitle="إدارة الملف التعريفي والبرامج السياحية وطلبات الحجز"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="الباقات" value={isLoading ? '...' : stats.packages} icon={BookOpen} />
        <StatCard
          label="طلبات جديدة"
          value={isLoading ? '...' : stats.pendingBookings}
          icon={CalendarCheck}
          variant="warning"
        />
        <StatCard
          label="حجوزات نشطة"
          value={isLoading ? '...' : stats.activeBookings}
          icon={MapPinned}
          variant="success"
        />
        <StatCard
          label="إجمالي الأرباح"
          value={isLoading ? '...' : `${formatPrice(stats.earnings)} ج.م`}
          icon={Coins}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{guideProfile ? 'ملف المرشد' : 'إنشاء ملف المرشد'}</CardTitle>
            <CardDescription>حدّث بياناتك الأساسية كما ستظهر للزوار</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {guideProfileQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">رقم الترخيص</Label>
                  <Input
                    id="licenseNumber"
                    value={guideForm.licenseNumber}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        licenseNumber: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">السعر اليومي (جنيه)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={guideForm.basePriceEgp}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        basePriceEgp: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bioAr">نبذة تعريفية</Label>
                  <Textarea
                    id="bioAr"
                    rows={4}
                    value={guideForm.bioAr}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        bioAr: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="languages">اللغات</Label>
                  <Input
                    id="languages"
                    placeholder="arabic, english"
                    value={guideForm.languages}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        languages: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialties">التخصصات</Label>
                  <Input
                    id="specialties"
                    placeholder="history, nature"
                    value={guideForm.specialties}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        specialties: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areas">مناطق العمل</Label>
                  <Input
                    id="areas"
                    placeholder="kharga, dakhla"
                    value={guideForm.areasOfOperation}
                    onChange={(event) =>
                      setGuideForm((prev) => ({
                        ...prev,
                        areasOfOperation: event.target.value,
                      }))
                    }
                  />
                </div>
                <Button onClick={() => void handleSaveGuide()} disabled={savingGuide}>
                  {savingGuide ? 'جارٍ الحفظ...' : guideProfile ? 'تحديث الملف' : 'إنشاء الملف'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{packageForm.id ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</CardTitle>
            <CardDescription>أنشئ برامجك السياحية وحدّث الأسعار والسعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="packageTitle">عنوان الباقة</Label>
              <Input
                id="packageTitle"
                value={packageForm.titleAr}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    titleAr: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packageDescription">الوصف</Label>
              <Textarea
                id="packageDescription"
                rows={3}
                value={packageForm.description}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="durationHours">الساعات</Label>
                <Input
                  id="durationHours"
                  type="number"
                  min="1"
                  value={packageForm.durationHours}
                  onChange={(event) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      durationHours: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPeople">أقصى عدد</Label>
                <Input
                  id="maxPeople"
                  type="number"
                  min="1"
                  value={packageForm.maxPeople}
                  onChange={(event) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      maxPeople: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceEgp">السعر (جنيه)</Label>
                <Input
                  id="priceEgp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={packageForm.priceEgp}
                  onChange={(event) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      priceEgp: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="includes">المتضمن</Label>
              <Input
                id="includes"
                placeholder="مواصلات, مرشد, وجبة خفيفة"
                value={packageForm.includes}
                onChange={(event) =>
                  setPackageForm((prev) => ({
                    ...prev,
                    includes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => void handleSavePackage()} disabled={savingPackage}>
                {savingPackage ? 'جارٍ الحفظ...' : packageForm.id ? 'تحديث الباقة' : 'إضافة الباقة'}
              </Button>
              {packageForm.id && (
                <Button variant="outline" onClick={() => setPackageForm(emptyPackageForm)}>
                  إلغاء التعديل
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الباقات الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          {packagesQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : myPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تقم بإضافة باقات بعد.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الباقة</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>السعة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPackages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.titleAr}</TableCell>
                    <TableCell>{pkg.durationHours} ساعة</TableCell>
                    <TableCell>{pkg.maxPeople}</TableCell>
                    <TableCell>{formatPrice(pkg.price)} ج.م</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPackageForm({
                              id: pkg.id,
                              titleAr: pkg.titleAr,
                              description: pkg.description ?? '',
                              durationHours: String(pkg.durationHours),
                              maxPeople: String(pkg.maxPeople),
                              priceEgp: String(pkg.price / 100),
                              includes: pkg.includes?.join(', ') ?? '',
                            })
                          }
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeletePackage(pkg.id)}
                        >
                          حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>طلبات الحجز</CardTitle>
          <CardDescription>يمكنك تأكيد الحجز أو بدء الجولة أو إنهاؤها من هنا</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد حجوزات مرتبطة بك حالياً.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الباقة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الأشخاص</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.packageTitleAr ?? booking.packageId}
                    </TableCell>
                    <TableCell>{booking.bookingDate}</TableCell>
                    <TableCell>{booking.peopleCount}</TableCell>
                    <TableCell>{booking.status}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {booking.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => void handleBookingAction(booking.id, 'confirm')}
                            disabled={processingBookingId === booking.id}
                          >
                            تأكيد
                          </Button>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleBookingAction(booking.id, 'start')}
                            disabled={processingBookingId === booking.id}
                          >
                            بدء الجولة
                          </Button>
                        )}
                        {booking.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleBookingAction(booking.id, 'complete')}
                            disabled={processingBookingId === booking.id}
                          >
                            إنهاء الجولة
                          </Button>
                        )}
                        {!['completed', 'cancelled'].includes(booking.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleBookingAction(booking.id, 'cancel')}
                            disabled={processingBookingId === booking.id}
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
