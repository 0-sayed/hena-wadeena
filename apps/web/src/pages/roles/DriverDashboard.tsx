import { Truck, Route, Users, Car } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useActivateRide, useCancelRide, useDeleteRide, useMyRides } from '@/hooks/use-map';

const rideStatusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  open: { label: 'مفتوح', variant: 'default' },
  full: { label: 'مكتمل', variant: 'secondary' },
  departed: { label: 'انطلق', variant: 'outline' },
  completed: { label: 'منتهي', variant: 'outline' },
  cancelled: { label: 'ملغي', variant: 'outline' },
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { data: myRidesData, isLoading } = useMyRides();
  const cancelRide = useCancelRide();
  const activateRide = useActivateRide();
  const deleteRide = useDeleteRide();
  const rides = myRidesData?.asDriver ?? [];

  const stats = {
    total: rides.length,
    available: rides.reduce((sum, r) => sum + (r.seatsTotal - r.seatsTaken), 0),
    booked: rides.reduce((sum, r) => sum + r.seatsTaken, 0),
  };

  const controlsDisabled = cancelRide.isPending || activateRide.isPending || deleteRide.isPending;

  const handleCancelRide = (rideId: string) => {
    cancelRide.mutate(rideId, {
      onSuccess: () => toast.success('تم إلغاء الرحلة'),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleActivateRide = (rideId: string) => {
    activateRide.mutate(rideId, {
      onSuccess: () => toast.success('تمت إعادة تفعيل الرحلة'),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDeleteRide = (rideId: string) => {
    if (!window.confirm('هل تريد حذف هذه الرحلة نهائياً؟')) {
      return;
    }

    deleteRide.mutate(rideId, {
      onSuccess: () => toast.success('تم حذف الرحلة'),
      onError: (error) => toast.error(error.message),
    });
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
            <p className="py-4 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
          ) : rides.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">لا توجد رحلات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المسار</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>المقاعد</TableHead>
                  <TableHead>السعر/مقعد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map((ride) => {
                  const st = rideStatusLabels[ride.status] ?? rideStatusLabels.open;
                  const canDelete = ride.status === 'cancelled' || ride.status === 'completed';

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
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void navigate(`/logistics/ride/${ride.id}`)}
                          >
                            التفاصيل
                          </Button>
                          {ride.status === 'open' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={controlsDisabled}
                              onClick={() => handleCancelRide(ride.id)}
                            >
                              إلغاء
                            </Button>
                          )}
                          {ride.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={controlsDisabled}
                              onClick={() => handleActivateRide(ride.id)}
                            >
                              تفعيل
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={controlsDisabled}
                              onClick={() => handleDeleteRide(ride.id)}
                            >
                              حذف
                            </Button>
                          )}
                        </div>
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
