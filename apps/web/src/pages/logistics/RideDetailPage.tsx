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

const STATUS_STYLES: Record<
  PassengerStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  requested: { label: 'بانتظار التأكيد', variant: 'secondary' },
  confirmed: { label: 'مؤكد', variant: 'default' },
  declined: { label: 'مرفوض', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'outline' },
};

const RideDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
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
      <Layout title="تفاصيل الرحلة">
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
      <Layout title="تفاصيل الرحلة">
        <section className="py-20 text-center">
          <p className="text-lg text-muted-foreground">حدث خطأ أثناء تحميل الرحلة</p>
          <Button variant="outline" className="mt-4" onClick={() => void navigate('/logistics')}>
            العودة
          </Button>
        </section>
      </Layout>
    );
  }

  if (!ride) {
    return (
      <Layout title="تفاصيل الرحلة">
        <section className="py-20 text-center">
          <p className="text-lg text-muted-foreground">الرحلة غير موجودة</p>
          <Button variant="outline" className="mt-4" onClick={() => void navigate('/logistics')}>
            العودة
          </Button>
        </section>
      </Layout>
    );
  }

  const isDriver = isAuthenticated && user?.id === ride.driverId;
  const available = ride.seatsTotal - ride.seatsTaken;
  const myPassengerRecord = myRidesData?.asPassenger.find((p) => p.rideId === id);
  const hasActiveJoin =
    myPassengerRecord &&
    (myPassengerRecord.status === 'requested' || myPassengerRecord.status === 'confirmed');
  const canDeleteRide = ride.status === 'cancelled' || ride.status === 'completed';

  const mapLocations: MapLocation[] = [
    {
      id: 'origin',
      name: ride.originName,
      lat: ride.origin.y,
      lng: ride.origin.x,
      color: '#16a34a',
    },
    {
      id: 'dest',
      name: ride.destinationName,
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
      toast.error('يجب تسجيل الدخول أولاً');
      void navigate('/login');
      return;
    }
    joinRide.mutate(
      { rideId: ride.id },
      {
        onSuccess: () => toast.success('تم إرسال طلب الانضمام'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleCancelJoin = () => {
    cancelJoin.mutate(ride.id, {
      onSuccess: () => toast.success('تم إلغاء طلب الانضمام'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleCancelRide = () => {
    cancelRide.mutate(ride.id, {
      onSuccess: () => toast.success('تم إلغاء الرحلة'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleActivateRide = () => {
    activateRide.mutate(ride.id, {
      onSuccess: () => toast.success('تمت إعادة تفعيل الرحلة'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDeleteRide = () => {
    if (!window.confirm('هل تريد حذف هذه الرحلة نهائياً؟')) {
      return;
    }

    deleteRide.mutate(ride.id, {
      onSuccess: () => {
        toast.success('تم حذف الرحلة');
        void navigate('/logistics');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleConfirm = (passengerId: string) => {
    confirmPassenger.mutate(
      { rideId: ride.id, passengerId },
      {
        onSuccess: () => toast.success('تم تأكيد الراكب'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDecline = (passengerId: string) => {
    declinePassenger.mutate(
      { rideId: ride.id, passengerId },
      {
        onSuccess: () => toast.success('تم رفض الراكب'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const driverActionPending =
    cancelRide.isPending || activateRide.isPending || deleteRide.isPending;

  return (
    <Layout title="تفاصيل الرحلة">
      <section className="py-8">
        <div className="container max-w-3xl px-4">
          <Button variant="ghost" onClick={() => void navigate('/logistics')} className="mb-6">
            <ArrowRight className="h-4 w-4" />
            العودة
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
                  <span>{ride.originName}</span>
                  <ArrowLeft className="h-6 w-6 text-primary" />
                  <MapPin className="h-5 w-5 text-red-600" />
                  <span>{ride.destinationName}</span>
                </div>
                <Badge variant={ride.status === 'open' ? 'default' : 'secondary'}>
                  {ride.status === 'open' ? 'متاحة' : ride.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDateTimeFull(ride.departureTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {available} من {ride.seatsTotal} مقاعد متاحة
                  </span>
                </div>
                <div className="col-span-2 text-2xl font-bold text-primary md:col-span-1 md:text-start">
                  {formatRidePrice(ride.pricePerSeat)}
                </div>
              </div>

              {ride.notes && (
                <p className="border-t pt-4 text-sm text-muted-foreground">{ride.notes}</p>
              )}

              <div className="flex flex-wrap gap-3 border-t pt-4">
                {!isAuthenticated && (
                  <Button onClick={() => void navigate('/login')}>سجل دخول للانضمام</Button>
                )}
                {isAuthenticated &&
                  !isDriver &&
                  hasMyRidesState &&
                  ride.status === 'open' &&
                  !hasActiveJoin &&
                  available > 0 && (
                    <Button onClick={handleJoin} disabled={joinRide.isPending}>
                      {joinRide.isPending ? 'جارٍ الإرسال...' : 'طلب مقعد'}
                    </Button>
                  )}
                {isAuthenticated && !isDriver && hasActiveJoin && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelJoin}
                    disabled={cancelJoin.isPending}
                  >
                    إلغاء طلبي
                  </Button>
                )}
                {isDriver && ride.status === 'open' && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelRide}
                    disabled={driverActionPending}
                  >
                    إلغاء الرحلة
                  </Button>
                )}
                {isDriver && ride.status === 'cancelled' && (
                  <Button
                    variant="outline"
                    onClick={handleActivateRide}
                    disabled={driverActionPending}
                  >
                    إعادة التفعيل
                  </Button>
                )}
                {isDriver && canDeleteRide && (
                  <Button
                    variant="secondary"
                    onClick={handleDeleteRide}
                    disabled={driverActionPending}
                  >
                    حذف الرحلة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isDriver && ride.passengers && ride.passengers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الركاب ({ride.passengers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ride.passengers.map((p: CarpoolPassenger) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{p.seats} مقعد</span>
                        <Badge variant={STATUS_STYLES[p.status].variant}>
                          {STATUS_STYLES[p.status].label}
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
                            تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDecline(p.id)}
                            disabled={declinePassenger.isPending}
                          >
                            <X className="ms-1 h-4 w-4" />
                            رفض
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
