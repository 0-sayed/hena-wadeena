import { Truck, Route, Users, Car } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CarpoolRide } from '@/services/api';

// Demo data matching CarpoolRide interface — will be replaced by mapAPI.getCarpoolRides() when Map service is ready
const DEMO_RIDES: CarpoolRide[] = [
  {
    id: 1,
    driver_id: 'demo',
    driver_name: 'أنت',
    origin_name: 'الداخلة',
    destination_name: 'الخارجة',
    origin: { lat: 25.49, lng: 29.0 },
    destination: { lat: 25.44, lng: 30.56 },
    departure_time: '2026-03-22T08:00:00Z',
    seats_total: 4,
    seats_taken: 2,
    price_per_seat: 15000,
    status: 'open',
    car_model: 'تويوتا هايلكس',
  },
  {
    id: 2,
    driver_id: 'demo',
    driver_name: 'أنت',
    origin_name: 'الخارجة',
    destination_name: 'الفرافرة',
    origin: { lat: 25.44, lng: 30.56 },
    destination: { lat: 27.06, lng: 27.97 },
    departure_time: '2026-03-23T06:30:00Z',
    seats_total: 3,
    seats_taken: 0,
    price_per_seat: 25000,
    status: 'open',
    car_model: 'نيسان باترول',
  },
];

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
  const rides = DEMO_RIDES;
  const stats = {
    total: rides.length,
    available: rides.reduce((sum, r) => sum + (r.seats_total - r.seats_taken), 0),
    booked: rides.reduce((sum, r) => sum + r.seats_taken, 0),
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
          <CardDescription>بيانات تجريبية — ستتصل بالخادم عند جاهزية خدمة الخرائط</CardDescription>
        </CardHeader>
        <CardContent>
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
                      {ride.origin_name} ← {ride.destination_name}
                    </TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {new Date(ride.departure_time).toLocaleDateString('ar-EG', {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {ride.seats_taken}/{ride.seats_total}
                    </TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {(ride.price_per_seat / 100).toFixed(0)} ج.م
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
