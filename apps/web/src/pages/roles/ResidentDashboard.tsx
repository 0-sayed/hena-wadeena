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

export default function ResidentDashboard() {
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data, isLoading, error } = useListings({ limit: 10 });
  const listings = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <DashboardShell
      icon={Home}
      title={pickLocalizedCopy(appLanguage, { ar: 'لوحة المقيم', en: 'Resident dashboard' })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'تابع الخدمات المحلية والإعلانات في منطقتك',
        en: 'Follow local services and listings in your area',
      })}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'إعلانات حديثة', en: 'Latest listings' })}
          value={isLoading ? '...' : total}
          icon={Newspaper}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'الخدمات', en: 'Services' })}
          value={pickLocalizedCopy(appLanguage, { ar: 'تصفح', en: 'Browse' })}
          icon={ShoppingBag}
          variant="muted"
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'نقاط الاهتمام', en: 'Points of interest' })}
          value={pickLocalizedCopy(appLanguage, { ar: 'تصفح', en: 'Browse' })}
          icon={MapPin}
          variant="muted"
        />
        <Link to="/benefits">
          <StatCard
            label={pickLocalizedCopy(appLanguage, {
              ar: 'خدمات حكومية',
              en: 'Government services',
            })}
            value={pickLocalizedCopy(appLanguage, { ar: 'تصفح', en: 'Browse' })}
            icon={Landmark}
            variant="muted"
          />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {pickLocalizedCopy(appLanguage, { ar: 'أحدث الإعلانات', en: 'Latest listings' })}
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
              {pickLocalizedCopy(appLanguage, {
                ar: 'حدث خطأ في تحميل البيانات',
                en: 'Something went wrong while loading listings',
              })}
            </p>
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              message={pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد إعلانات حاليًا',
                en: 'No listings available right now',
              })}
              actionLabel={pickLocalizedCopy(appLanguage, {
                ar: 'تصفح السوق',
                en: 'Browse marketplace',
              })}
              actionHref="/marketplace"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'العنوان', en: 'Title' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'النوع', en: 'Type' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}
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
                        : pickLocalizedCopy(appLanguage, {
                            ar: 'غير محدد',
                            en: 'Unknown',
                          })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={listing.isVerified ? 'default' : 'secondary'}>
                        {listing.isVerified
                          ? pickLocalizedCopy(appLanguage, { ar: 'موثق', en: 'Verified' })
                          : pickLocalizedCopy(appLanguage, {
                              ar: 'قيد المراجعة',
                              en: 'Under review',
                            })}
                      </Badge>
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
