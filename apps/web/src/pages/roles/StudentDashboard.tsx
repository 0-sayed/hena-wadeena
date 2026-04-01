import { Link } from 'react-router';
import { ArrowLeft, BookOpen, CalendarCheck, GraduationCap, Home, MapPin } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookingsCard } from '@/components/dashboard/BookingsCard';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { useListings } from '@/hooks/use-listings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { districtLabel, formatPrice, transactionLabel } from '@/lib/format';

export default function StudentDashboard() {
  const { data, isLoading, error } = useMyBookings();
  const { data: housingData, isLoading: isHousingLoading } = useListings({
    category: 'accommodation',
    limit: 3,
    sort: 'price|asc',
  });

  const bookings = data?.data ?? [];
  const housingListings = housingData?.data ?? [];

  const stats = {
    bookings: data?.total ?? bookings.length,
    upcoming: bookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'pending')
      .length,
  };

  return (
    <DashboardShell
      icon={GraduationCap}
      title="لوحة الطالب"
      subtitle="متابعة السكن والحجوزات والخدمات الطلابية"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="حجوزاتي" value={isLoading ? '...' : stats.bookings} icon={CalendarCheck} />
        <StatCard
          label="قادمة"
          value={isLoading ? '...' : stats.upcoming}
          icon={BookOpen}
          variant="warning"
        />
        <StatCard label="السكن" value="تصفح" icon={Home} variant="muted" />
      </div>

      <BookingsCard bookings={bookings} isLoading={isLoading} error={error} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>البحث عن سكن</CardTitle>
            <CardDescription>
              أرخص 3 خيارات سكن متاحة حالياً مع وصول سريع إلى صفحة السكن الكاملة
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/tourism/accommodation">
              عرض جميع السكن
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isHousingLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
              >
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))
          ) : housingListings.length > 0 ? (
            housingListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/tourism/accommodation/${listing.id}`}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <img
                  src={listing.images?.[0] ?? '/placeholder.jpg'}
                  alt={listing.titleAr}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{listing.titleAr}</p>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {districtLabel(listing.district ?? 'غير محدد')}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="font-bold text-primary">{formatPrice(listing.price)}</p>
                      <p className="text-xs text-muted-foreground">{listing.priceUnit}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      سكن
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {transactionLabel(listing.transaction)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              لا توجد خيارات سكن منشورة حالياً.
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
