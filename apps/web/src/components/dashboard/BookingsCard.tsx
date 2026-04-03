import { CalendarCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getBookingStatusLabels } from '@/lib/booking-status';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
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
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const statusLabels = getBookingStatusLabels(appLanguage);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'حجوزاتي', en: 'My bookings' })}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">
            {pickLocalizedCopy(appLanguage, {
              ar: 'حدث خطأ في تحميل البيانات',
              en: 'Something went wrong while loading your bookings',
            })}
          </p>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            message={pickLocalizedCopy(appLanguage, {
              ar: 'لا توجد حجوزات بعد',
              en: 'No bookings yet',
            })}
            actionLabel={pickLocalizedCopy(appLanguage, {
              ar: 'تصفح المرشدين',
              en: 'Browse guides',
            })}
            actionHref="/guides"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الباقة', en: 'Package' })}</TableHead>
                <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'التاريخ', en: 'Date' })}</TableHead>
                <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const st = statusLabels[booking.status] ?? statusLabels.pending;
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium truncate max-w-[140px]">
                      {pickLocalizedField(appLanguage, {
                        ar: booking.packageTitleAr,
                        en: booking.packageTitleEn,
                      }) || `#${booking.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell
                      dir="ltr"
                      className={appLanguage === 'en' ? 'text-start' : 'text-end'}
                    >
                      {new Date(booking.bookingDate).toLocaleDateString(
                        appLanguage === 'en' ? 'en-US' : 'ar-EG',
                      )}
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
