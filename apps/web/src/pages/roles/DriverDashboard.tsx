import { Truck, Route, Users, Car } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
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
import { useMyRides } from '@/hooks/use-map';

const rideStatusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  open: { label: 'مفتوح', variant: 'default' },
  full: { label: 'مكتمل', variant: 'secondary' },
  departed: { label: 'انطلق', variant: 'outline' },
  completed: { label: 'منتهي', variant: 'outline' },
};

export default function DriverDashboard() {
  const { data: myRidesData, isLoading } = useMyRides();
  const rides = myRidesData?.asDriver ?? [];
  const stats = {
    total: rides.length,
    available: rides.reduce((sum, r) => sum + (r.seatsTotal - r.seatsTaken), 0),
    booked: rides.reduce((sum, r) => sum + r.seatsTaken, 0),
  };

  return (
    <DashboardShell
      icon={Truck}
      title="لوحة السائق"
      subtitle="إدارة رحلات الكاربول والمقاعد المتاحة"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="الرحلات" value={stats.total} icon={Route} />
        <StatCard label="مقاعد متاحة" value={stats.available} icon={Car} variant="success" />
        <StatCard label="مقاعد محجوزة" value={stats.booked} icon={Users} variant="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>رحلاتي</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">جارٍ التحميل...</p>
          ) : rides.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">لا توجد رحلات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المسار</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>المقاعد</TableHead>
                  <TableHead>السعر/مقعد</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map((ride) => {
                  const st = rideStatusLabels[ride.status] ?? rideStatusLabels.open;
                  return (
                    <TableRow key={ride.id}>
                      <TableCell className="font-medium">
                        {ride.originName} ← {ride.destinationName}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {new Date(ride.departureTime).toLocaleDateString('ar-EG', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        {ride.seatsTaken}/{ride.seatsTotal}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {(ride.pricePerSeat / 100).toFixed(0)} ج.م
                      </TableCell>
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
