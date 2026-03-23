import { TrendingUp, Briefcase, MapPin, BarChart3 } from 'lucide-react';
import { Link } from 'react-router';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useOpportunities } from '@/hooks/use-opportunities';
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

const opportunityStatusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  active: { label: 'نشط', variant: 'default' },
  closed: { label: 'مغلق', variant: 'outline' },
  pending: { label: 'قيد المراجعة', variant: 'secondary' },
};

export default function InvestorDashboard() {
  const { data, isLoading, error } = useOpportunities();
  const opportunities = data?.data ?? [];

  const stats = {
    total: opportunities.length,
    sectors: new Set(opportunities.map((o) => o.category)).size,
    locations: new Set(opportunities.map((o) => o.location)).size,
  };

  return (
    <DashboardShell
      icon={TrendingUp}
      title="لوحة المستثمر"
      subtitle="استعراض الفرص الاستثمارية المتاحة"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="الفرص المتاحة" value={isLoading ? '...' : stats.total} icon={Briefcase} />
        <StatCard
          label="القطاعات"
          value={isLoading ? '...' : stats.sectors}
          icon={BarChart3}
          variant="success"
        />
        <StatCard
          label="المواقع"
          value={isLoading ? '...' : stats.locations}
          icon={MapPin}
          variant="muted"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الفرص الاستثمارية</CardTitle>
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
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              message="لا توجد فرص استثمارية حاليًا"
              actionLabel="تصفح الاستثمارات"
              actionHref="/investment"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفرصة</TableHead>
                  <TableHead>القطاع</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>العائد المتوقع</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-medium">
                      <Link to={`/investment/opportunity/${opp.id}`} className="hover:underline">
                        {opp.title}
                      </Link>
                    </TableCell>
                    <TableCell>{opp.category}</TableCell>
                    <TableCell>{opp.location}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {opp.roi}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const st =
                          opportunityStatusLabels[opp.status] ?? opportunityStatusLabels.active;
                        return <Badge variant={st.variant}>{st.label}</Badge>;
                      })()}
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
