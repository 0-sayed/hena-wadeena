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
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

const rideStatusLabels: Record<
  string,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  open: { ar: 'مفتوح', en: 'Open', variant: 'default' },
  full: { ar: 'مكتمل', en: 'Full', variant: 'secondary' },
  departed: { ar: 'انطلق', en: 'Departed', variant: 'outline' },
  completed: { ar: 'منتهي', en: 'Completed', variant: 'outline' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'outline' },
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data: myRidesData, isLoading } = useMyRides();
  const cancelRide = useCancelRide();
  const activateRide = useActivateRide();
  const deleteRide = useDeleteRide();
  const rides = myRidesData?.asDriver ?? [];

  const stats = {
    total: rides.length,
    available: rides.reduce((sum, ride) => sum + (ride.seatsTotal - ride.seatsTaken), 0),
    booked: rides.reduce((sum, ride) => sum + ride.seatsTaken, 0),
  };

  const controlsDisabled = cancelRide.isPending || activateRide.isPending || deleteRide.isPending;

  const handleCancelRide = (rideId: string) => {
    cancelRide.mutate(rideId, {
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تم إلغاء الرحلة',
            en: 'Ride cancelled',
          }),
        ),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleActivateRide = (rideId: string) => {
    activateRide.mutate(rideId, {
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تمت إعادة تفعيل الرحلة',
            en: 'Ride reactivated',
          }),
        ),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDeleteRide = (rideId: string) => {
    if (
      !window.confirm(
        pickLocalizedCopy(appLanguage, {
          ar: 'هل تريد حذف هذه الرحلة نهائيًا؟',
          en: 'Do you want to permanently delete this ride?',
        }),
      )
    ) {
      return;
    }

    deleteRide.mutate(rideId, {
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تم حذف الرحلة',
            en: 'Ride deleted',
          }),
        ),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <DashboardShell
      icon={Truck}
      title={pickLocalizedCopy(appLanguage, { ar: 'لوحة السائق', en: 'Driver dashboard' })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'إدارة رحلات الكاربول والمقاعد المتاحة',
        en: 'Manage carpool rides and available seats',
      })}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={pickLocalizedCopy(appLanguage, { ar: 'الرحلات', en: 'Rides' })} value={stats.total} icon={Route} />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'مقاعد متاحة', en: 'Available seats' })}
          value={stats.available}
          icon={Car}
          variant="success"
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'مقاعد محجوزة', en: 'Booked seats' })}
          value={stats.booked}
          icon={Users}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'رحلاتي', en: 'My rides' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, { ar: 'جارٍ التحميل...', en: 'Loading...' })}
            </p>
          ) : rides.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, { ar: 'لا توجد رحلات بعد', en: 'No rides yet' })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المسار', en: 'Route' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الموعد', en: 'Schedule' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المقاعد', en: 'Seats' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'السعر/مقعد', en: 'Price/seat' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map((ride) => {
                  const status = rideStatusLabels[ride.status] ?? rideStatusLabels.open;
                  const canDelete = ride.status === 'cancelled' || ride.status === 'completed';

                  return (
                    <TableRow key={ride.id}>
                      <TableCell className="font-medium">
                        {ride.originName} ← {ride.destinationName}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {new Date(ride.departureTime).toLocaleDateString(
                          appLanguage === 'en' ? 'en-US' : 'ar-EG',
                          {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </TableCell>
                      <TableCell>
                        {ride.seatsTaken}/{ride.seatsTotal}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {(ride.pricePerSeat / 100).toFixed(0)}{' '}
                        {pickLocalizedCopy(appLanguage, { ar: 'ج.م', en: 'EGP' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{pickLocalizedCopy(appLanguage, status)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void navigate(`/logistics/ride/${ride.id}`)}
                          >
                            {pickLocalizedCopy(appLanguage, { ar: 'التفاصيل', en: 'Details' })}
                          </Button>
                          {ride.status === 'open' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={controlsDisabled}
                              onClick={() => handleCancelRide(ride.id)}
                            >
                              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
                            </Button>
                          )}
                          {ride.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={controlsDisabled}
                              onClick={() => handleActivateRide(ride.id)}
                            >
                              {pickLocalizedCopy(appLanguage, { ar: 'تفعيل', en: 'Activate' })}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={controlsDisabled}
                              onClick={() => handleDeleteRide(ride.id)}
                            >
                              {pickLocalizedCopy(appLanguage, { ar: 'حذف', en: 'Delete' })}
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
