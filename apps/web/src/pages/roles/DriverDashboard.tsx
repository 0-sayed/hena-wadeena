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
import { useTranslation } from 'react-i18next';

const rideStatusVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  full: 'secondary',
  departed: 'outline',
  completed: 'outline',
  cancelled: 'outline',
};

export default function DriverDashboard() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { language } = useAuth();
  const appLanguage = language === 'en' ? 'en' : 'ar';
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
        toast.success(t('driver.toasts.cancelled')),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleActivateRide = (rideId: string) => {
    activateRide.mutate(rideId, {
      onSuccess: () =>
        toast.success(t('driver.toasts.reactivated')),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDeleteRide = (rideId: string) => {
    if (!window.confirm(t('driver.toasts.confirmDelete'))) {
      return;
    }

    deleteRide.mutate(rideId, {
      onSuccess: () =>
        toast.success(t('driver.toasts.deleted')),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <DashboardShell
      icon={Truck}
      title={t('driver.title')}
      subtitle={t('driver.subtitle')}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('driver.stats.rides')} value={stats.total} icon={Route} />
        <StatCard
          label={t('driver.stats.available')}
          value={stats.available}
          icon={Car}
          variant="success"
        />
        <StatCard
          label={t('driver.stats.booked')}
          value={stats.booked}
          icon={Users}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('driver.rides.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('driver.rides.loading')}
            </p>
          ) : rides.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('driver.rides.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('driver.rides.table.route')}</TableHead>
                  <TableHead>{t('driver.rides.table.schedule')}</TableHead>
                  <TableHead>{t('driver.rides.table.seats')}</TableHead>
                  <TableHead>{t('driver.rides.table.price')}</TableHead>
                  <TableHead>{t('driver.rides.table.status')}</TableHead>
                  <TableHead>{t('driver.rides.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rides.map((ride) => {
                  const statusLabel = t(`driver.status.${ride.status}`);
                  const variant = rideStatusVariants[ride.status] ?? 'default';
                  const canDelete = ride.status === 'cancelled' || ride.status === 'completed';

                  return (
                    <TableRow key={ride.id}>
                      <TableCell className="font-medium">
                        {ride.originName} ← {ride.destinationName}
                      </TableCell>
                      <TableCell dir="ltr" className="text-end">
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
                      <TableCell dir="ltr" className="text-end">
                        {(ride.pricePerSeat / 100).toFixed(0)} {t('driver.currency')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>{statusLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void navigate(`/logistics/ride/${ride.id}`)}
                          >
                            {t('driver.rides.detailsBtn')}
                          </Button>
                          {ride.status === 'open' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={controlsDisabled}
                              onClick={() => handleCancelRide(ride.id)}
                            >
                              {t('driver.rides.cancelBtn')}
                            </Button>
                          )}
                          {ride.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={controlsDisabled}
                              onClick={() => handleActivateRide(ride.id)}
                            >
                              {t('driver.rides.activateBtn')}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={controlsDisabled}
                              onClick={() => handleDeleteRide(ride.id)}
                            >
                              {t('driver.rides.deleteBtn')}
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
