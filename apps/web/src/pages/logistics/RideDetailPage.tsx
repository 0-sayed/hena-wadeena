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
import type { AppLanguage } from '@/lib/localization';
import { pickLocalizedCopy } from '@/lib/localization';
import { localizeAreaName } from '@/lib/area-presets';

const STATUS_STYLES: Record<
  PassengerStatus,
  {
    label: { ar: string; en: string };
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  requested: { label: { ar: 'بانتظار التأكيد', en: 'Pending confirmation' }, variant: 'secondary' },
  confirmed: { label: { ar: 'مؤكد', en: 'Confirmed' }, variant: 'default' },
  declined: { label: { ar: 'مرفوض', en: 'Declined' }, variant: 'destructive' },
  cancelled: { label: { ar: 'ملغي', en: 'Cancelled' }, variant: 'outline' },
};

const rideStatusLabels = {
  open: { ar: 'متاحة', en: 'Open' },
  full: { ar: 'مكتملة المقاعد', en: 'Full' },
  departed: { ar: 'غادرت', en: 'Departed' },
  completed: { ar: 'مكتملة', en: 'Completed' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' },
} as const;

function getRideStatusLabel(status: keyof typeof rideStatusLabels, language: AppLanguage): string {
  return pickLocalizedCopy(language, rideStatusLabels[status]);
}

const RideDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, language: appLanguage } = useAuth();
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
      <Layout>
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
      <Layout>
        <section className="py-20 text-center">
          <p className="text-lg text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'حدث خطأ أثناء تحميل الرحلة',
              en: 'Something went wrong while loading the ride',
            })}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void navigate('/logistics')}>
            {pickLocalizedCopy(appLanguage, { ar: 'العودة', en: 'Back' })}
          </Button>
        </section>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout>
        <section className="py-20 text-center">
          <p className="text-lg text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'الرحلة غير موجودة',
              en: 'Ride not found',
            })}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void navigate('/logistics')}>
            {pickLocalizedCopy(appLanguage, { ar: 'العودة', en: 'Back' })}
          </Button>
        </section>
      </Layout>
    );
  }

  const isDriver = isAuthenticated && user?.id === ride.driverId;
  const available = ride.seatsTotal - ride.seatsTaken;
  const originName = localizeAreaName(ride.originName, appLanguage);
  const destinationName = localizeAreaName(ride.destinationName, appLanguage);
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
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'يجب تسجيل الدخول أولاً',
          en: 'You need to sign in first',
        }),
      );
      void navigate('/login');
      return;
    }
    joinRide.mutate(
      { rideId: ride.id },
      {
        onSuccess: () =>
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم إرسال طلب الانضمام',
              en: 'Ride request sent',
            }),
          ),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleCancelJoin = () => {
    cancelJoin.mutate(ride.id, {
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تم إلغاء طلب الانضمام',
            en: 'Ride request cancelled',
          }),
        ),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleCancelRide = () => {
    cancelRide.mutate(ride.id, {
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تم إلغاء الرحلة',
            en: 'Ride cancelled',
          }),
        ),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleActivateRide = () => {
    activateRide.mutate(ride.id, {
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تمت إعادة تفعيل الرحلة',
            en: 'Ride reactivated',
          }),
        ),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDeleteRide = () => {
    if (
      !window.confirm(
        pickLocalizedCopy(appLanguage, {
          ar: 'هل تريد حذف هذه الرحلة نهائياً؟',
          en: 'Do you want to permanently delete this ride?',
        }),
      )
    ) {
      return;
    }

    deleteRide.mutate(ride.id, {
      onSuccess: () => {
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تم حذف الرحلة',
            en: 'Ride deleted',
          }),
        );
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
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم تأكيد الراكب',
              en: 'Passenger confirmed',
            }),
          ),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDecline = (passengerId: string) => {
    declinePassenger.mutate(
      { rideId: ride.id, passengerId },
      {
        onSuccess: () =>
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم رفض الراكب',
              en: 'Passenger declined',
            }),
          ),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const driverActionPending =
    cancelRide.isPending || activateRide.isPending || deleteRide.isPending;

  return (
    <Layout>
      <section className="py-8">
        <div className="container max-w-3xl px-4">
          <Button variant="ghost" onClick={() => void navigate('/logistics')} className="mb-6">
            <ArrowRight className="ml-2 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'العودة', en: 'Back' })}
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
                  {getRideStatusLabel(ride.status, appLanguage)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDateTimeFull(ride.departureTime, appLanguage)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {pickLocalizedCopy(appLanguage, {
                      ar: `${available} من ${ride.seatsTotal} مقاعد متاحة`,
                      en: `${available} of ${ride.seatsTotal} seats available`,
                    })}
                  </span>
                </div>
                <div className="col-span-2 text-2xl font-bold text-primary md:col-span-1 md:text-left">
                  {formatRidePrice(ride.pricePerSeat, appLanguage)}
                </div>
              </div>

              {ride.notes && (
                <p className="border-t pt-4 text-sm text-muted-foreground">{ride.notes}</p>
              )}

              <div className="flex flex-wrap gap-3 border-t pt-4">
                {!isAuthenticated && (
                  <Button onClick={() => void navigate('/login')}>
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'سجل دخول للانضمام',
                      en: 'Sign in to join',
                    })}
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
                        ? pickLocalizedCopy(appLanguage, {
                            ar: 'جارٍ الإرسال...',
                            en: 'Sending...',
                          })
                        : pickLocalizedCopy(appLanguage, {
                            ar: 'طلب مقعد',
                            en: 'Request a seat',
                          })}
                    </Button>
                  )}
                {isAuthenticated && !isDriver && hasActiveJoin && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelJoin}
                    disabled={cancelJoin.isPending}
                  >
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'إلغاء طلبي',
                      en: 'Cancel my request',
                    })}
                  </Button>
                )}
                {isDriver && ride.status === 'open' && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelRide}
                    disabled={driverActionPending}
                  >
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'إلغاء الرحلة',
                      en: 'Cancel ride',
                    })}
                  </Button>
                )}
                {isDriver && ride.status === 'cancelled' && (
                  <Button
                    variant="outline"
                    onClick={handleActivateRide}
                    disabled={driverActionPending}
                  >
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'إعادة التفعيل',
                      en: 'Reactivate',
                    })}
                  </Button>
                )}
                {isDriver && canDeleteRide && (
                  <Button
                    variant="secondary"
                    onClick={handleDeleteRide}
                    disabled={driverActionPending}
                  >
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'حذف الرحلة',
                      en: 'Delete ride',
                    })}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isDriver && ride.passengers && ride.passengers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {pickLocalizedCopy(appLanguage, {
                    ar: `الركاب (${ride.passengers.length})`,
                    en: `Passengers (${ride.passengers.length})`,
                  })}
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
                          {pickLocalizedCopy(appLanguage, {
                            ar: `${p.seats} مقعد`,
                            en: `${p.seats} ${p.seats === 1 ? 'seat' : 'seats'}`,
                          })}
                        </span>
                        <Badge variant={STATUS_STYLES[p.status].variant}>
                          {pickLocalizedCopy(appLanguage, STATUS_STYLES[p.status].label)}
                        </Badge>
                      </div>
                      {p.status === 'requested' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(p.id)}
                            disabled={confirmPassenger.isPending}
                          >
                            <Check className="ml-1 h-4 w-4" />
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'تأكيد',
                              en: 'Confirm',
                            })}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecline(p.id)}
                            disabled={declinePassenger.isPending}
                          >
                            <X className="ml-1 h-4 w-4" />
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'رفض',
                              en: 'Decline',
                            })}
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
