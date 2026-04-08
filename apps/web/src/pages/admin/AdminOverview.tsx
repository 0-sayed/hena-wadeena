import {
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  FileCheck,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/use-admin';

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
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const { data: stats, isLoading, error } = useAdminStats();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'فشل تحميل الإحصائيات',
            en: 'Failed to load statistics',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {pickLocalizedCopy(appLanguage, { ar: 'نظرة عامة', en: 'Overview' })}
        </h1>
        <p className="text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'إحصائيات المنصة وحالة الطلبات المعلقة',
            en: 'Platform metrics and pending review queues',
          })}
        </p>
      </div>

      {/* Stats Grid */}
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
              title={pickLocalizedCopy(appLanguage, { ar: 'إجمالي المستخدمين', en: 'Total users' })}
              value={stats.users.total}
              icon={Users}
              description={pickLocalizedCopy(appLanguage, {
                ar: `+${stats.users.newLast30Days} هذا الشهر`,
                en: `+${stats.users.newLast30Days} this month`,
              })}
              href="/admin/users"
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'طلبات KYC المعلقة',
                en: 'Pending KYC submissions',
              })}
              value={stats.kyc.pending}
              icon={FileCheck}
              href="/admin/moderation"
              variant={stats.kyc.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'إعلانات تحتاج مراجعة',
                en: 'Listings awaiting review',
              })}
              value={stats.listings.unverified}
              icon={ShoppingBag}
              href="/admin/moderation"
              variant={stats.listings.unverified > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'نقاط اهتمام معلقة',
                en: 'Pending points of interest',
              })}
              value={stats.pois.pending}
              icon={MapPin}
              href="/admin/map"
              variant={stats.pois.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'إدارة معرفة الذكاء الاصطناعي',
                en: 'AI knowledge management',
              })}
              value="RAG"
              icon={Bot}
              description={pickLocalizedCopy(appLanguage, {
                ar: 'تحميل أو حذف ملفات PDF المرجعية للمساعد',
                en: 'Load or delete the assistant reference PDFs',
              })}
              href="/admin/ai"
            />
          </>
        ) : null}
      </div>

      {/* Secondary Stats */}
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
              title={pickLocalizedCopy(appLanguage, {
                ar: 'المرشدون النشطون',
                en: 'Active guides',
              })}
              value={stats.guides.active}
              icon={CheckCircle}
              description={pickLocalizedCopy(appLanguage, {
                ar: `${stats.guides.verified} موثق`,
                en: `${stats.guides.verified} verified`,
              })}
              href="/admin/guides"
              variant="success"
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'الحجوزات المعلقة',
                en: 'Pending bookings',
              })}
              value={stats.bookings.pending}
              icon={Clock}
              href="/admin/guides"
              variant={stats.bookings.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'إجمالي الإعلانات',
                en: 'Total listings',
              })}
              value={stats.listings.total}
              icon={ShoppingBag}
              description={pickLocalizedCopy(appLanguage, {
                ar: `${stats.listings.verified} موثق`,
                en: `${stats.listings.verified} verified`,
              })}
            />
            <StatCard
              title={pickLocalizedCopy(appLanguage, {
                ar: 'فرص الاستثمار',
                en: 'Investment opportunities',
              })}
              value={stats.investments.total}
              icon={TrendingUp}
              description={pickLocalizedCopy(appLanguage, {
                ar: `${stats.investments.totalApplications} طلب`,
                en: `${stats.investments.totalApplications} applications`,
              })}
            />
          </>
        ) : null}
      </div>

      {/* Meta info */}
      {stats?.meta && (
        <p className="text-xs text-muted-foreground">
          {pickLocalizedCopy(appLanguage, { ar: 'آخر تحديث:', en: 'Updated:' })}{' '}
          {new Date(stats.meta.cachedAt).toLocaleString(locale)}
          {stats.meta.degraded && (
            <span className="me-2 text-yellow-500">
              {pickLocalizedCopy(appLanguage, {
                ar: '(بعض البيانات غير متاحة)',
                en: '(Some data is unavailable)',
              })}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
