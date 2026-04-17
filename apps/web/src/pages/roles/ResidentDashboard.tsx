import {
  Home,
  ShoppingBag,
  MapPin,
  Newspaper,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Sun,
} from 'lucide-react';
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
import type { LucideIcon } from 'lucide-react';

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'إعلانات حديثة', en: 'Latest listings' })}
          value={isLoading ? '...' : total}
          icon={Newspaper}
        />
      </div>

      <QuickLinks appLanguage={appLanguage} />

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

// ── QuickLinks ────────────────────────────────────────────────────────────────

type QuickLinkItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  description: string;
};

function QuickLinks({ appLanguage }: { appLanguage: AppLanguage }) {
  const isRtl = appLanguage === 'ar';
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  const links: QuickLinkItem[] = [
    {
      to: '/marketplace',
      icon: ShoppingBag,
      label: pickLocalizedCopy(appLanguage, { ar: 'الخدمات والسوق', en: 'Marketplace' }),
      description: pickLocalizedCopy(appLanguage, {
        ar: 'تصفح المنتجات والأسعار والموردين',
        en: 'Browse products, prices and suppliers',
      }),
    },
    {
      to: '/tourism',
      icon: MapPin,
      label: pickLocalizedCopy(appLanguage, { ar: 'السياحة والأماكن', en: 'Tourism & places' }),
      description: pickLocalizedCopy(appLanguage, {
        ar: 'اكتشف المعالم ونقاط الاهتمام',
        en: 'Discover attractions and points of interest',
      }),
    },
    {
      to: '/benefits',
      icon: Landmark,
      label: pickLocalizedCopy(appLanguage, { ar: 'خدمات حكومية', en: 'Government services' }),
      description: pickLocalizedCopy(appLanguage, {
        ar: 'تحقق من البرامج الحكومية التي تؤهّلك',
        en: 'Check which government programs you qualify for',
      }),
    },
    {
      to: '/solar',
      icon: Sun,
      label: pickLocalizedCopy(appLanguage, { ar: 'الطاقة الشمسية', en: 'Solar energy' }),
      description: pickLocalizedCopy(appLanguage, {
        ar: 'مزودو التركيب، الخريطة المجتمعية، ومنح الدعم',
        en: 'Find installers, view the community map, and explore subsidies',
      }),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {pickLocalizedCopy(appLanguage, { ar: 'روابط سريعة', en: 'Quick links' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(({ to, icon: Icon, label, description }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted group-hover:bg-primary/10">
              <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
