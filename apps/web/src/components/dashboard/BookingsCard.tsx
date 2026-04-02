import { CalendarCheck } from 'lucide-react';
import { bookingStatusLabels } from '@/lib/booking-status';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Booking } from '@/services/api';

type BookingsCardProps = {
  bookings: Booking[];
  isLoading: boolean;
  error: Error | null;
};

export function BookingsCard({ bookings, isLoading, error }: BookingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>حجوزاتي</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">حدث خطأ في تحميل البيانات</p>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            message="لا توجد حجوزات بعد"
            actionLabel="تصفح المرشدين"
            actionHref="/guides"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الباقة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const st = bookingStatusLabels[booking.status] ?? bookingStatusLabels.pending;
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium truncate max-w-[140px]">
                      {booking.packageTitleAr ?? `#${booking.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {new Date(booking.bookingDate).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
