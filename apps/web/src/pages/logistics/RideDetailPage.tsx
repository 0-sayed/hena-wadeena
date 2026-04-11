import { useParams, useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import type { MapLocation, MapPolyline } from '@/components/maps/InteractiveMap';
import { buildGoogleMapsDirectionsUrl } from '@/lib/maps';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/motion/Skeleton';
import { ArrowRight, ArrowLeft, MapPin, Clock, Users, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import {
  useRide,
  useMyRides,
  useJoinRide,
  useCancelJoin,
  useCancelRide,
  useActivateRide,
  useDeleteRide,
  useConfirmPassenger,
  useDeclinePassenger,
} from '@/hooks/use-map';
import type { CarpoolPassenger, PassengerStatus } from '@/services/api';
import { formatRidePrice } from '@/lib/format';
import { formatDateTimeFull } from '@/lib/dates';
import { localizeAreaName } from '@/lib/area-presets';

function getPassengerStatusInfo(status: PassengerStatus, t: (key: string) => string) {
  const variants: Record<PassengerStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    requested: 'secondary',
    confirmed: 'default',
    declined: 'destructive',
    cancelled: 'outline',
  };
  return {
    label: t(`rides.passengerStatus.${status}`),
    variant: variants[status],
  };
}

function getRideStatusLabel(status: string, t: (key: string) => string): string {
  return t(`rides.status.${status}`, { defaultValue: status });
}

const RideDetailPage = () => {
  const { t } = useTranslation('logistics');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, language } = useAuth();
  const { data: ride, isLoading, isError } = useRide(id);
  const { data: myRidesData, isSuccess: hasMyRidesState } = useMyRides(isAuthenticated);

  const joinRide = useJoinRide();
  const cancelJoin = useCancelJoin();
  const cancelRide = useCancelRide();
  const activateRide = useActivateRide();
  const deleteRide = useDeleteRide();
  const confirmPassenger = useConfirmPassenger();
  const declinePassenger = useDeclinePassenger();

  if (isLoading) {
    return (
      <Layout title={t('rides.rideDetails.title')}>
        <section className="py-8">
          <div className="container max-w-3xl px-4">
            <Skeleton h="h-[300px]" className="mb-6 rounded-xl" />
            <Skeleton h="h-48" className="rounded-xl" />
          </div>
        </section>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout title={t('rides.rideDetails.title')}>
        <section className="py-20 text-center">
          <p className="text-lg text-muted-foreground">
            {t('rides.rideDetails.loadError')}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void navigate('/logistics')}>
            {t('back')}
          </Button>
        </section>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout title={t('rides.rideDetails.title')}>
        <section className="py-20 text-center">
          <p className="text-lg text-muted-foreground">
            {t('rides.rideDetails.notFound')}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void navigate('/logistics')}>
            {t('back')}
          </Button>
        </section>
      </Layout>
    );
  }

  const isDriver = isAuthenticated && user?.id === ride.driverId;
  const available = ride.seatsTotal - ride.seatsTaken;
  const originName = localizeAreaName(ride.originName, (language === 'en' ? 'en' : 'ar'));
  const destinationName = localizeAreaName(ride.destinationName, (language === 'en' ? 'en' : 'ar'));
  const myPassengerRecord = myRidesData?.asPassenger.find((p) => p.rideId === id);
  const hasActiveJoin =
    myPassengerRecord &&
    (myPassengerRecord.status === 'requested' || myPassengerRecord.status === 'confirmed');
  const canDeleteRide = ride.status === 'cancelled' || ride.status === 'completed';

  const mapLocations: MapLocation[] = [
    {
      id: 'origin',
      name: originName,
      lat: ride.origin.y,
      lng: ride.origin.x,
      color: '#16a34a',
    },
    {
      id: 'dest',
      name: destinationName,
      lat: ride.destination.y,
      lng: ride.destination.x,
      color: '#dc2626',
    },
  ];

  const mapPolylines: MapPolyline[] = [
    {
      positions: [
        [ride.origin.y, ride.origin.x],
        [ride.destination.y, ride.destination.x],
      ],
    },
  ];

  const handleJoin = () => {
    if (!isAuthenticated) {
      toast.error(t('rides.loginRequiredToast'));
      void navigate('/login');
      return;
    }
    joinRide.mutate(
      { rideId: ride.id },
      {
        onSuccess: () =>
          toast.success(t('rides.rideDetails.toasts.requestSent')),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleCancelJoin = () => {
    cancelJoin.mutate(ride.id, {
      onSuccess: () =>
        toast.success(t('rides.rideDetails.toasts.requestCancelled')),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleCancelRide = () => {
    cancelRide.mutate(ride.id, {
      onSuccess: () =>
        toast.success(t('rides.toasts.cancelled')),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleActivateRide = () => {
    activateRide.mutate(ride.id, {
      onSuccess: () =>
        toast.success(t('rides.toasts.reactivated')),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDeleteRide = () => {
    if (!window.confirm(t('rides.deleteConfirm'))) {
      return;
    }

    deleteRide.mutate(ride.id, {
      onSuccess: () => {
        toast.success(t('rides.toasts.deleted'));
        void navigate('/logistics');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleConfirm = (passengerId: string) => {
    confirmPassenger.mutate(
      { rideId: ride.id, passengerId },
      {
        onSuccess: () =>
          toast.success(t('rides.rideDetails.toasts.passengerConfirmed')),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDecline = (passengerId: string) => {
    declinePassenger.mutate(
      { rideId: ride.id, passengerId },
      {
        onSuccess: () =>
          toast.success(t('rides.rideDetails.toasts.passengerDeclined')),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const driverActionPending =
    cancelRide.isPending || activateRide.isPending || deleteRide.isPending;

  return (
    <Layout title={t('rides.rideDetails.title')}>
      <section className="py-8">
        <div className="container max-w-3xl px-4">
          <Button
            variant="ghost"
            onClick={() => void navigate('/logistics')}
            className="mb-6 gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            {t('back')}
          </Button>

          <InteractiveMap
            locations={mapLocations}
            className="mb-6 h-[300px] w-full rounded-xl"
            fitBounds
            polylines={mapPolylines}
            googleMapsUrl={buildGoogleMapsDirectionsUrl(
              { lat: ride.origin.y, lng: ride.origin.x },
              { lat: ride.destination.y, lng: ride.destination.x },
            )}
          />

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-2xl font-bold">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span>{originName}</span>
                  <ArrowLeft className="h-6 w-6 text-primary" />
                  <MapPin className="h-5 w-5 text-red-600" />
                  <span>{destinationName}</span>
                </div>
                <Badge variant={ride.status === 'open' ? 'default' : 'secondary'}>
                  {getRideStatusLabel(ride.status, t)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDateTimeFull(ride.departureTime, (language === 'en' ? 'en' : 'ar'))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {t('rides.rideDetails.seatsAvailability', { count: available, total: ride.seatsTotal })}
                  </span>
                </div>
                <div className="col-span-2 text-2xl font-bold text-primary md:col-span-1 md:text-start">
                  {formatRidePrice(ride.pricePerSeat, (language === 'en' ? 'en' : 'ar'))}
                </div>
              </div>

              {ride.notes && (
                <p className="border-t pt-4 text-sm text-muted-foreground">{ride.notes}</p>
              )}

              <div className="flex flex-wrap gap-3 border-t pt-4">
                {!isAuthenticated && (
                  <Button onClick={() => void navigate('/login')}>
                    {t('rides.rideDetails.signInToJoin')}
                  </Button>
                )}
                {isAuthenticated &&
                  !isDriver &&
                  hasMyRidesState &&
                  ride.status === 'open' &&
                  !hasActiveJoin &&
                  available > 0 && (
                    <Button onClick={handleJoin} disabled={joinRide.isPending}>
                      {joinRide.isPending
                        ? t('rides.rideDetails.sending')
                        : t('rides.rideDetails.requestSeat')}
                    </Button>
                  )}
                {isAuthenticated && !isDriver && hasActiveJoin && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelJoin}
                    disabled={cancelJoin.isPending}
                  >
                    {t('rides.rideDetails.cancelRequest')}
                  </Button>
                )}
                {isDriver && ride.status === 'open' && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelRide}
                    disabled={driverActionPending}
                  >
                    {t('rides.actions.cancel')}
                  </Button>
                )}
                {isDriver && ride.status === 'cancelled' && (
                  <Button
                    variant="outline"
                    onClick={handleActivateRide}
                    disabled={driverActionPending}
                  >
                    {t('rides.actions.reactivate')}
                  </Button>
                )}
                {isDriver && canDeleteRide && (
                  <Button
                    variant="secondary"
                    onClick={handleDeleteRide}
                    disabled={driverActionPending}
                  >
                    {t('rides.actions.delete')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isDriver && ride.passengers && ride.passengers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('rides.rideDetails.passengersTitle', { count: ride.passengers.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ride.passengers.map((p: CarpoolPassenger) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {t('rides.userRides.passengerSeats', { count: p.seats })}
                        </span>
                        <Badge variant={getPassengerStatusInfo(p.status, t).variant}>
                          {getPassengerStatusInfo(p.status, t).label}
                        </Badge>
                      </div>
                      {p.status === 'requested' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(p.id)}
                            disabled={confirmPassenger.isPending}
                          >
                            <Check className="ms-1 h-4 w-4" />
                            {t('confirm', { defaultValue: 'Confirm' })}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecline(p.id)}
                            disabled={declinePassenger.isPending}
                          >
                            <X className="ms-1 h-4 w-4" />
                            {t('decline', { defaultValue: 'Decline' })}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default RideDetailPage;
