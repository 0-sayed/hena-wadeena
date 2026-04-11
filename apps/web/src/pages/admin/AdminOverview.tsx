import {
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  FileCheck,
  MapPin,
  Megaphone,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/use-admin';
import { useTranslation } from 'react-i18next';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  href?: string;
  variant?: 'default' | 'warning' | 'success';
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  href,
  variant = 'default',
}: StatCardProps) {
  const content = (
    <Card className={href ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={cn(
            'h-4 w-4',
            variant === 'warning' && 'text-yellow-500',
            variant === 'success' && 'text-green-500',
            variant === 'default' && 'text-muted-foreground',
          )}
        />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const { language } = useAuth();
  const { t } = useTranslation('admin');
  const locale = language === 'en' ? 'en-US' : 'ar-EG';
  const { data: stats, isLoading, error } = useAdminStats();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          {t('overview.loadError')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t('overview.pageTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('overview.pageSubtitle')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              title={t('overview.stats.totalUsers')}
              value={stats.users.total}
              icon={Users}
              description={t('overview.stats.newUsersMonth', { count: stats.users.newLast30Days })}
              href="/admin/users"
            />
            <StatCard
              title={t('overview.stats.pendingKyc')}
              value={stats.kyc.pending}
              icon={FileCheck}
              href="/admin/moderation"
              variant={stats.kyc.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={t('overview.stats.listingsReview')}
              value={stats.listings.unverified}
              icon={ShoppingBag}
              href="/admin/moderation"
              variant={stats.listings.unverified > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={t('overview.stats.pendingPois')}
              value={stats.pois.pending}
              icon={MapPin}
              href="/admin/map"
              variant={stats.pois.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={t('overview.stats.aiManagement')}
              value="RAG"
              icon={Bot}
              description={t('overview.stats.aiDescription')}
              href="/admin/ai"
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              title={t('overview.stats.activeGuides')}
              value={stats.guides.active}
              icon={CheckCircle}
              description={t('overview.stats.verifiedCount', { count: stats.guides.verified })}
              href="/admin/guides"
              variant="success"
            />
            <StatCard
              title={t('overview.stats.pendingBookings')}
              value={stats.bookings.pending}
              icon={Clock}
              href="/admin/guides"
              variant={stats.bookings.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={t('overview.stats.totalListings')}
              value={stats.listings.total}
              icon={ShoppingBag}
              description={t('overview.stats.verifiedCount', { count: stats.listings.verified })}
            />
            <StatCard
              title={t('overview.stats.investments')}
              value={stats.investments.total}
              icon={TrendingUp}
              description={t('overview.stats.investmentApps', { count: stats.investments.totalApplications })}
            />
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {t('overview.announcements.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('overview.announcements.desc')}
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/listings?dialog=new">
              {t('overview.announcements.newBtn')}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {stats?.meta && (
        <p className="text-xs text-muted-foreground">
          {t('overview.updated')}{' '}
          {new Date(stats.meta.cachedAt).toLocaleString(locale)}
          {stats.meta.degraded && (
            <span className="me-2 text-yellow-500">
              {t('overview.degraded')}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
