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

const bookingStatusLabels: Record<string, string> = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  in_progress: 'جاري',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const bookingStatusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  in_progress: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

export default function AdminGuides() {
  const [activeTab, setActiveTab] = useState('guides');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const guidesQuery = useAdminGuides();
  const bookingsQuery = useAdminBookings({
    status: bookingStatusFilter !== 'all' ? bookingStatusFilter : undefined,
  });

  const verifyLicense = useVerifyGuideLicense();
  const setGuideStatus = useSetGuideStatus();
  const cancelBooking = useAdminCancelBooking();

  const handleCancelBooking = () => {
    if (!cancelDialog || !cancelReason.trim()) return;
    cancelBooking.mutate({ id: cancelDialog, reason: cancelReason });
    setCancelDialog(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المرشدين</h1>
        <p className="text-muted-foreground">إدارة المرشدين والحجوزات</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="guides" className="gap-2">
            <Shield className="h-4 w-4" />
            المرشدون
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2">
            <Calendar className="h-4 w-4" />
            الحجوزات
          </TabsTrigger>
        </TabsList>

        {/* Guides Tab */}
        <TabsContent value="guides">
          <Card>
            <CardHeader>
              <CardTitle>قائمة المرشدين</CardTitle>
              <CardDescription>
                {guidesQuery.data ? `${guidesQuery.data.total} مرشد` : 'جاري التحميل...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guidesQuery.error ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <p className="text-muted-foreground">فشل تحميل البيانات</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المرشد</TableHead>
                      <TableHead>التقييم</TableHead>
                      <TableHead>الترخيص</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الباقات</TableHead>
                      <TableHead className="w-32">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guidesQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : guidesQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">لا يوجد مرشدون</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      guidesQuery.data?.data.map((guide) => (
                        <TableRow key={guide.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {guide.profileImage ? (
                                <img
                                  src={guide.profileImage}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                  <Shield className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">{guide.bioAr || 'مرشد'}</span>
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
                              {guide.licenseVerified ? 'موثق' : 'غير موثق'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={guide.active ? 'default' : 'outline'}>
                              {guide.active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>{guide.packageCount}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                title={guide.licenseVerified ? 'إلغاء التوثيق' : 'توثيق الترخيص'}
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
                                title={guide.active ? 'تعطيل' : 'تفعيل'}
                                disabled={setGuideStatus.isPending}
                                onClick={() =>
                                  setGuideStatus.mutate({ id: guide.id, active: !guide.active })
                                }
                              >
                                {guide.active ? (
                                  <span className="text-destructive">تعطيل</span>
                                ) : (
                                  <span className="text-green-600">تفعيل</span>
                                )}
                              </Button>
                            </div>
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

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>الحجوزات</CardTitle>
                  <CardDescription>
                    {bookingsQuery.data ? `${bookingsQuery.data.total} حجز` : 'جاري التحميل...'}
                  </CardDescription>
                </div>
                <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {Object.entries(bookingStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
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
                  <p className="text-muted-foreground">فشل تحميل البيانات</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الباقة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>عدد الأشخاص</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="w-24">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingsQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : bookingsQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">لا توجد حجوزات</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookingsQuery.data?.data.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">
                            {booking.packageTitleAr || booking.packageId}
                          </TableCell>
                          <TableCell>
                            {new Date(booking.bookingDate).toLocaleDateString('ar-EG')}
                          </TableCell>
                          <TableCell>{booking.peopleCount}</TableCell>
                          <TableCell>
                            {(booking.totalPrice / 100).toLocaleString('ar-EG')} ج.م
                          </TableCell>
                          <TableCell>
                            <Badge variant={bookingStatusVariants[booking.status] || 'secondary'}>
                              {bookingStatusLabels[booking.status] || booking.status}
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
                                إلغاء
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

      {/* Cancel Booking Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الحجز</DialogTitle>
            <DialogDescription>يرجى إدخال سبب الإلغاء</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="سبب الإلغاء..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>
              رجوع
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim()}
              onClick={handleCancelBooking}
            >
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
