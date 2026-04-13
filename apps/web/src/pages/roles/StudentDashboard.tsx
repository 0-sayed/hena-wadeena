import { Link } from 'react-router';
import { ArrowLeft, BookOpen, CalendarCheck, GraduationCap, Home, MapPin } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookingsCard } from '@/components/dashboard/BookingsCard';
import { useAuth } from '@/hooks/use-auth';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { useListings } from '@/hooks/use-listings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { districtLabel, formatPrice, transactionLabel } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';

export default function StudentDashboard() {
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
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
    upcoming: bookings.filter(
      (booking) => booking.status === 'confirmed' || booking.status === 'pending',
    ).length,
  };

  return (
    <DashboardShell
      icon={GraduationCap}
      title={pickLocalizedCopy(appLanguage, { ar: 'لوحة الطالب', en: 'Student dashboard' })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'متابعة السكن والحجوزات والخدمات الطلابية',
        en: 'Track housing, bookings, and student services',
      })}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'حجوزاتي', en: 'My bookings' })}
          value={isLoading ? '...' : stats.bookings}
          icon={CalendarCheck}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'قادمة', en: 'Upcoming' })}
          value={isLoading ? '...' : stats.upcoming}
          icon={BookOpen}
          variant="warning"
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'السكن', en: 'Housing' })}
          value={pickLocalizedCopy(appLanguage, { ar: 'تصفح', en: 'Browse' })}
          icon={Home}
          variant="muted"
        />
      </div>

      <BookingsCard bookings={bookings} isLoading={isLoading} error={error} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'البحث عن سكن', en: 'Find housing' })}
            </CardTitle>
            <CardDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'أرخص 3 خيارات سكن متاحة حاليًا مع وصول سريع إلى صفحة السكن الكاملة',
                en: 'The lowest-priced housing options available now with quick access to the full housing page',
              })}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/tourism/accommodation">
              {pickLocalizedCopy(appLanguage, { ar: 'عرض جميع السكن', en: 'View all housing' })}
              <ArrowLeft className="me-2 h-4 w-4" />
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
                  alt={
                    pickLocalizedField(appLanguage, {
                      ar: listing.titleAr,
                      en: listing.titleEn,
                    }) || listing.id
                  }
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {pickLocalizedField(appLanguage, {
                          ar: listing.titleAr,
                          en: listing.titleEn,
                        })}
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {districtLabel(
                            listing.district ??
                              pickLocalizedCopy(appLanguage, {
                                ar: 'غير محدد',
                                en: 'Unknown',
                              }),
                            appLanguage,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-start">
                      <p className="font-bold text-primary">
                        {formatPrice(listing.price)}{' '}
                        {pickLocalizedCopy(appLanguage, { ar: 'ج.م', en: 'EGP' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{listing.priceUnit}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {pickLocalizedCopy(appLanguage, { ar: 'سكن', en: 'Housing' })}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {transactionLabel(listing.transaction, appLanguage)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد خيارات سكن منشورة حاليًا.',
                en: 'No housing options are published right now.',
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {pickLocalizedCopy(appLanguage, { ar: 'فرص العمل', en: 'Job opportunities' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'تصفح الوظائف المتاحة وتابع طلباتك.',
              en: 'Browse available jobs and track your applications.',
            })}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/jobs">
                {pickLocalizedCopy(appLanguage, { ar: 'تصفح الوظائف', en: 'Browse jobs' })}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/jobs/my-applications">
                {pickLocalizedCopy(appLanguage, { ar: 'طلباتي', en: 'My applications' })}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
