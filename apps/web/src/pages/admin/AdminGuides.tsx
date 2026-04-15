import { AlertCircle, Calendar, CheckCircle, Shield, Star, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminBookings,
  useAdminCancelBooking,
  useAdminGuides,
  useSetGuideStatus,
  useVerifyGuideLicense,
} from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';

type LocalizedLabel = {
  ar: string;
  en: string;
};

const bookingStatusLabels: Record<string, LocalizedLabel> = {
  pending: { ar: 'معلق', en: 'Pending' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  in_progress: { ar: 'جاري', en: 'In progress' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

const bookingStatusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

function countLabel(
  total: number,
  language: AppLanguage,
  copy: { ar: string; enSingular: string; enPlural: string },
) {
  if (language === 'en') {
    return `${total} ${total === 1 ? copy.enSingular : copy.enPlural}`;
  }

  return `${total} ${copy.ar}`;
}

export default function AdminGuides() {
  const [activeTab, setActiveTab] = useState('guides');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const currencyLabel = pickLocalizedCopy(appLanguage, { ar: 'ج.م', en: 'EGP' });

  const guidesQuery = useAdminGuides();
  const bookingsQuery = useAdminBookings({
    status: bookingStatusFilter !== 'all' ? bookingStatusFilter : undefined,
  });

  const verifyLicense = useVerifyGuideLicense();
  const setGuideStatus = useSetGuideStatus();
  const cancelBooking = useAdminCancelBooking();

  const localizedBookingStatus = (status: string) =>
    pickLocalizedCopy(appLanguage, bookingStatusLabels[status] ?? { ar: status, en: status });

  const handleCancelBooking = () => {
    if (!cancelDialog || !cancelReason.trim()) {
      return;
    }

    cancelBooking.mutate(
      { id: cancelDialog, reason: cancelReason },
      {
        onSuccess: () => {
          setCancelDialog(null);
          setCancelReason('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {pickLocalizedCopy(appLanguage, { ar: 'إدارة المرشدين', en: 'Guide management' })}
        </h1>
        <p className="text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'إدارة المرشدين والحجوزات',
            en: 'Manage guides and booking operations',
          })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="guides" className="gap-2">
            <Shield className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'المرشدون', en: 'Guides' })}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <Calendar className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'الحجوزات', en: 'Bookings' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides">
          <Card>
            <CardHeader>
              <CardTitle>
                {pickLocalizedCopy(appLanguage, { ar: 'قائمة المرشدين', en: 'Guide list' })}
              </CardTitle>
              <CardDescription>
                {guidesQuery.data
                  ? countLabel(guidesQuery.data.total, appLanguage, {
                      ar: 'مرشد',
                      enSingular: 'guide',
                      enPlural: 'guides',
                    })
                  : pickLocalizedCopy(appLanguage, { ar: 'جاري التحميل...', en: 'Loading...' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guidesQuery.error ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-muted-foreground">
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'فشل تحميل البيانات',
                      en: 'Could not load the data',
                    })}
                  </p>
                </div>
              ) : (
                <Table className="!table-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'المرشد', en: 'Guide' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'التقييم', en: 'Rating' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'الترخيص', en: 'License' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'الباقات', en: 'Packages' })}
                      </TableHead>
                      <TableHead className="w-32">
                        {pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guidesQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 6 }).map((__, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : guidesQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'لا يوجد مرشدون',
                              en: 'No guides found',
                            })}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      guidesQuery.data?.data.map((guide) => {
                        const guideName =
                          pickLocalizedField(appLanguage, {
                            ar: guide.bioAr,
                            en: guide.bioEn,
                          }) || pickLocalizedCopy(appLanguage, { ar: 'مرشد', en: 'Guide' });

                        return (
                          <TableRow key={guide.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {guide.profileImage ? (
                                  <img
                                    src={guide.profileImage}
                                    alt={pickLocalizedCopy(appLanguage, {
                                      ar: 'صورة المرشد',
                                      en: 'Guide profile image',
                                    })}
                                    className="h-10 w-10 rounded-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="font-medium">{guideName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{guide.ratingAvg?.toFixed(1) || '-'}</span>
                                <span className="text-muted-foreground">({guide.ratingCount})</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={guide.licenseVerified ? 'default' : 'secondary'}>
                                {pickLocalizedCopy(appLanguage, {
                                  ar: guide.licenseVerified ? 'موثق' : 'غير موثق',
                                  en: guide.licenseVerified ? 'Verified' : 'Unverified',
                                })}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={guide.active ? 'default' : 'outline'}>
                                {pickLocalizedCopy(appLanguage, {
                                  ar: guide.active ? 'نشط' : 'غير نشط',
                                  en: guide.active ? 'Active' : 'Inactive',
                                })}
                              </Badge>
                            </TableCell>
                            <TableCell>{guide.packageCount}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={pickLocalizedCopy(appLanguage, {
                                    ar: guide.licenseVerified ? 'إلغاء التوثيق' : 'توثيق الترخيص',
                                    en: guide.licenseVerified
                                      ? 'Remove verification'
                                      : 'Verify license',
                                  })}
                                  disabled={verifyLicense.isPending}
                                  onClick={() =>
                                    verifyLicense.mutate({
                                      id: guide.id,
                                      verified: !guide.licenseVerified,
                                    })
                                  }
                                >
                                  {guide.licenseVerified ? (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={pickLocalizedCopy(appLanguage, {
                                    ar: guide.active ? 'تعطيل' : 'تفعيل',
                                    en: guide.active ? 'Deactivate' : 'Activate',
                                  })}
                                  disabled={setGuideStatus.isPending}
                                  onClick={() =>
                                    setGuideStatus.mutate({ id: guide.id, active: !guide.active })
                                  }
                                >
                                  {guide.active ? (
                                    <span className="text-destructive">
                                      {pickLocalizedCopy(appLanguage, {
                                        ar: 'تعطيل',
                                        en: 'Deactivate',
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-green-600">
                                      {pickLocalizedCopy(appLanguage, {
                                        ar: 'تفعيل',
                                        en: 'Activate',
                                      })}
                                    </span>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {pickLocalizedCopy(appLanguage, { ar: 'الحجوزات', en: 'Bookings' })}
                  </CardTitle>
                  <CardDescription>
                    {bookingsQuery.data
                      ? countLabel(bookingsQuery.data.total, appLanguage, {
                          ar: 'حجز',
                          enSingular: 'booking',
                          enPlural: 'bookings',
                        })
                      : pickLocalizedCopy(appLanguage, { ar: 'جاري التحميل...', en: 'Loading...' })}
                  </CardDescription>
                </div>
                <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue
                      placeholder={pickLocalizedCopy(appLanguage, {
                        ar: 'جميع الحالات',
                        en: 'All statuses',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {pickLocalizedCopy(appLanguage, { ar: 'جميع الحالات', en: 'All statuses' })}
                    </SelectItem>
                    {Object.entries(bookingStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {pickLocalizedCopy(appLanguage, label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {bookingsQuery.error ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-muted-foreground">
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'فشل تحميل البيانات',
                      en: 'Could not load the data',
                    })}
                  </p>
                </div>
              ) : (
                <Table className="!table-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'الباقة', en: 'Package' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'التاريخ', en: 'Date' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'عدد الأشخاص', en: 'People' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'المبلغ', en: 'Amount' })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}
                      </TableHead>
                      <TableHead className="w-24">
                        {pickLocalizedCopy(appLanguage, { ar: 'إجراء', en: 'Action' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingsQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 6 }).map((__, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : bookingsQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'لا توجد حجوزات',
                              en: 'No bookings found',
                            })}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookingsQuery.data?.data.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {pickLocalizedField(appLanguage, {
                              ar: booking.packageTitleAr,
                              en: booking.packageTitleEn,
                            }) || booking.packageId}
                          </TableCell>
                          <TableCell>
                            {new Date(booking.bookingDate).toLocaleDateString(locale)}
                          </TableCell>
                          <TableCell>{booking.peopleCount}</TableCell>
                          <TableCell>
                            <span>{(booking.totalPrice / 100).toLocaleString(locale)}</span>{' '}
                            <span>{currencyLabel}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={bookingStatusVariants[booking.status] || 'secondary'}>
                              {localizedBookingStatus(booking.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!['completed', 'cancelled'].includes(booking.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={cancelBooking.isPending}
                                onClick={() => setCancelDialog(booking.id)}
                              >
                                {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!cancelDialog}
        onOpenChange={() => {
          setCancelDialog(null);
          setCancelReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء الحجز', en: 'Cancel booking' })}
            </DialogTitle>
            <DialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'يرجى إدخال سبب الإلغاء',
                en: 'Please enter a cancellation reason',
              })}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={pickLocalizedCopy(appLanguage, {
              ar: 'سبب الإلغاء...',
              en: 'Cancellation reason...',
            })}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialog(null);
                setCancelReason('');
              }}
            >
              {pickLocalizedCopy(appLanguage, { ar: 'رجوع', en: 'Back' })}
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelBooking.isPending}
              onClick={handleCancelBooking}
            >
              {pickLocalizedCopy(appLanguage, {
                ar: 'تأكيد الإلغاء',
                en: 'Confirm cancellation',
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
