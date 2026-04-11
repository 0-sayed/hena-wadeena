import { Home, ShoppingBag, MapPin, Newspaper, Landmark } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useAuth } from '@/hooks/use-auth';
import { useListings } from '@/hooks/use-listings';
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
import { districtLabel, listingCategoryLabel } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export default function ResidentDashboard() {
  const {
    t
  } = useTranslation(['dashboard', 'market', 'tourism', 'investment', 'marketplace']);

  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data, isLoading, error } = useListings({ limit: 10 });
  const listings = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <DashboardShell
      icon={Home}
      title={t('resident.title')}
      subtitle={t('resident.subtitle')}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('resident.listings.title')}
          value={isLoading ? '...' : total}
          icon={Newspaper}
        />
        <StatCard
          label={t('categories.service')}
          value={t('student.stats.browse')}
          icon={ShoppingBag}
          variant="muted"
        />
        <StatCard
          label={t('resident.stats.pois')}
          value={t('student.stats.browse')}
          icon={MapPin}
          variant="muted"
        />
        <Link to="/benefits">
          <StatCard
            label={t('resident.stats.govServices')}
            value={t('student.stats.browse')}
            icon={Landmark}
            variant="muted"
          />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('resident.listings.title')}
          </CardTitle>
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
              {t('resident.listings.loadError')}
            </p>
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              message={t('resident.listings.empty')}
              actionLabel={t('resident.listings.browseMarketplace')}
              actionHref="/marketplace"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('resident.table.title')}
                  </TableHead>
                  <TableHead>
                    {t('attractions.typeLabel')}
                  </TableHead>
                  <TableHead>
                    {t('listingEditor.districtLabel')}
                  </TableHead>
                  <TableHead>
                    {t('startupDetails.status')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      {pickLocalizedField(appLanguage, {
                        ar: listing.titleAr,
                        en: listing.titleEn,
                      })}
                    </TableCell>
                    <TableCell>{listingCategoryLabel(listing.category, appLanguage)}</TableCell>
                    <TableCell>
                      {listing.district
                        ? districtLabel(listing.district, appLanguage)
                        : t('student.housingSearch.unknownDistrict')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={listing.isVerified ? 'default' : 'secondary'}>
                        {listing.isVerified
                          ? t('supplierDetails.verified')
                          : t('merchant.businesses.verification.pending')}
                      </Badge>
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
