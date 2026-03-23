import { Home, ShoppingBag, MapPin, Newspaper } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
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

export default function ResidentDashboard() {
  const { data, isLoading, error } = useListings({ limit: 10 });
  const listings = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <DashboardShell
      icon={Home}
      title="لوحة المقيم"
      subtitle="تابع الخدمات المحلية والإعلانات في منطقتك"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="إعلانات حديثة" value={isLoading ? '...' : total} icon={Newspaper} />
        <StatCard label="الخدمات" value="تصفح" icon={ShoppingBag} variant="muted" />
        <StatCard label="نقاط الاهتمام" value="تصفح" icon={MapPin} variant="muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أحدث الإعلانات</CardTitle>
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
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              message="لا توجد إعلانات حاليًا"
              actionLabel="تصفح السوق"
              actionHref="/marketplace"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.titleAr}</TableCell>
                    <TableCell>{listing.category}</TableCell>
                    <TableCell>{listing.district}</TableCell>
                    <TableCell>
                      <Badge variant={listing.isVerified ? 'default' : 'secondary'}>
                        {listing.isVerified ? 'موثق' : 'قيد المراجعة'}
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
