import { Store, Building2, CheckCircle, Clock } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useMyBusinesses } from '@/hooks/use-my-businesses';
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

// NOTE: verificationStatus (not status) determines review state.
const verificationLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  verified: { label: 'موثق', variant: 'default' },
  pending: { label: 'قيد المراجعة', variant: 'secondary' },
  rejected: { label: 'مرفوض', variant: 'outline' },
  suspended: { label: 'موقوف', variant: 'outline' },
};

export default function MerchantDashboard() {
  const { data, isLoading, error } = useMyBusinesses();
  // NOTE: GET /businesses/mine returns Business[] (plain array, no wrapper).
  const businesses = data ?? [];

  const stats = {
    total: businesses.length,
    verified: businesses.filter((b) => b.verificationStatus === 'verified').length,
    pending: businesses.filter((b) => b.verificationStatus === 'pending').length,
  };

  return (
    <DashboardShell
      icon={Store}
      title="لوحة التاجر"
      subtitle="إدارة نشاطك التجاري ومتابعة حالة التسجيل"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="إجمالي الأنشطة" value={isLoading ? '...' : stats.total} icon={Building2} />
        <StatCard
          label="موثق"
          value={isLoading ? '...' : stats.verified}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          label="قيد المراجعة"
          value={isLoading ? '...' : stats.pending}
          icon={Clock}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أنشطتي التجارية</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-sm">حدث خطأ في تحميل البيانات</p>
          ) : businesses.length === 0 ? (
            <EmptyState
              icon={Store}
              message="لم تسجل أي نشاط تجاري بعد"
              actionLabel="تصفح الدليل التجاري"
              actionHref="/marketplace"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم النشاط</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((biz) => {
                  const st =
                    verificationLabels[biz.verificationStatus] ?? verificationLabels.pending;
                  return (
                    <TableRow key={biz.id}>
                      <TableCell className="font-medium">{biz.nameAr}</TableCell>
                      <TableCell>{biz.category}</TableCell>
                      <TableCell>{biz.district}</TableCell>
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
    </DashboardShell>
  );
}
