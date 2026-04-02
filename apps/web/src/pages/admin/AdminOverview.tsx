import {
  AlertCircle,
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
  const { data: stats, isLoading, error } = useAdminStats();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">فشل تحميل الإحصائيات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">نظرة عامة</h1>
        <p className="text-muted-foreground">إحصائيات المنصة وحالة الطلبات المعلقة</p>
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
              title="إجمالي المستخدمين"
              value={stats.users.total}
              icon={Users}
              description={`+${stats.users.newLast30Days} هذا الشهر`}
              href="/admin/users"
            />
            <StatCard
              title="طلبات KYC المعلقة"
              value={stats.kyc.pending}
              icon={FileCheck}
              href="/admin/moderation"
              variant={stats.kyc.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="إعلانات تحتاج مراجعة"
              value={stats.listings.unverified}
              icon={ShoppingBag}
              href="/admin/moderation"
              variant={stats.listings.unverified > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="نقاط اهتمام معلقة"
              value={stats.pois.pending}
              icon={MapPin}
              href="/admin/map"
              variant={stats.pois.pending > 0 ? 'warning' : 'default'}
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
              title="المرشدون النشطون"
              value={stats.guides.active}
              icon={CheckCircle}
              description={`${stats.guides.verified} موثق`}
              href="/admin/guides"
              variant="success"
            />
            <StatCard
              title="الحجوزات المعلقة"
              value={stats.bookings.pending}
              icon={Clock}
              href="/admin/guides"
              variant={stats.bookings.pending > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="إجمالي الإعلانات"
              value={stats.listings.total}
              icon={ShoppingBag}
              description={`${stats.listings.verified} موثق`}
            />
            <StatCard
              title="فرص الاستثمار"
              value={stats.investments.total}
              icon={TrendingUp}
              description={`${stats.investments.totalApplications} طلب`}
            />
          </>
        ) : null}
      </div>

      {/* Meta info */}
      {stats?.meta && (
        <p className="text-xs text-muted-foreground">
          آخر تحديث: {new Date(stats.meta.cachedAt).toLocaleString('ar-EG')}
          {stats.meta.degraded && (
            <span className="me-2 text-yellow-500">(بعض البيانات غير متاحة)</span>
          )}
        </p>
      )}
    </div>
  );
}
