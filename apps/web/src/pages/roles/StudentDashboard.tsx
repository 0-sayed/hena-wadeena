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
import { useTranslation } from 'react-i18next';

export default function StudentDashboard() {
  const {
    t
  } = useTranslation(['dashboard', 'tourism', 'wallet']);

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
      title={t('student.title')}
      subtitle={t('student.subtitle')}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={t('bookings.title')}
          value={isLoading ? '...' : stats.bookings}
          icon={CalendarCheck}
        />
        <StatCard
          label={t('student.stats.upcoming')}
          value={isLoading ? '...' : stats.upcoming}
          icon={BookOpen}
          variant="warning"
        />
        <StatCard
          label={t('student.housingSearch.housingBadge')}
          value={t('student.stats.browse')}
          icon={Home}
          variant="muted"
        />
      </div>

      <BookingsCard bookings={bookings} isLoading={isLoading} error={error} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>
              {t('student.housingSearch.title')}
            </CardTitle>
            <CardDescription>
              {t('student.housingSearch.description')}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/tourism/accommodation">
              {t('student.housingSearch.viewAllBtn')}
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
                              t('student.housingSearch.unknownDistrict'),
                            appLanguage,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-start">
                      <p className="font-bold text-primary">
                        {formatPrice(listing.price)}{' '}
                        {t('transactions.currency')}
                      </p>
                      <p className="text-xs text-muted-foreground">{listing.priceUnit}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t('student.housingSearch.housingBadge')}
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
              {t('No housing options are published right now.')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('student.jobs.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('student.jobs.description')}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/jobs">
                {t('student.jobs.browseJobs')}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/jobs/my-applications">
                {t('student.jobs.myApplications')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
