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

type Booking = {
  id: string;
  package_title: string;
  guide_name: string;
  booking_date: string;
  status: string;
};

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
                <TableHead>الجولة</TableHead>
                <TableHead>المرشد</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const st = bookingStatusLabels[booking.status] ?? bookingStatusLabels.pending;
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.package_title}</TableCell>
                    <TableCell>{booking.guide_name}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {new Date(booking.booking_date).toLocaleDateString('ar-EG')}
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
