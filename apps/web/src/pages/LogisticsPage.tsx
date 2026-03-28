import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { PageHero } from '@/components/layout/PageHero';
import { PageTransition } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { Skeleton } from '@/components/motion/Skeleton';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import type { MapLocation } from '@/components/maps/InteractiveMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Clock,
  Car,
  Map as MapIcon,
  Search,
  LocateFixed,
  ArrowLeft,
  Phone,
  Globe,
  Star,
  Plus,
} from 'lucide-react';
import { formatRidePrice } from '@/lib/format';
import { formatDateTimeShort } from '@/lib/dates';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { useAuth } from '@/hooks/use-auth';
import { usePois, usePoi, useRides, useMyRides } from '@/hooks/use-map';
import type { Poi, PoiCategory, CarpoolRide, CarpoolPassenger } from '@/services/api';
import { UserRole } from '@hena-wadeena/types';
import { AREA_PRESETS, findArea } from '@/lib/area-presets';
import { toast } from 'sonner';
import heroLogistics from '@/assets/hero-logistics.jpg';

// ── POI Category Config ────────────────────────────────────────────

const POI_CATEGORIES: { value: PoiCategory; label: string; color: string }[] = [
  { value: 'historical', label: 'تاريخي', color: '#d97706' },
  { value: 'natural', label: 'طبيعي', color: '#16a34a' },
  { value: 'religious', label: 'ديني', color: '#9333ea' },
  { value: 'recreational', label: 'ترفيهي', color: '#2563eb' },
  { value: 'accommodation', label: 'إقامة', color: '#4f46e5' },
  { value: 'restaurant', label: 'مطعم', color: '#ea580c' },
  { value: 'service', label: 'خدمات', color: '#6b7280' },
  { value: 'government', label: 'حكومي', color: '#dc2626' },
];

function getCategoryColor(category: PoiCategory): string {
  return POI_CATEGORIES.find((c) => c.value === category)?.color ?? '#6b7280';
}

function getCategoryLabel(category: PoiCategory): string {
  return POI_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

// ── Main Component ─────────────────────────────────────────────────

const LogisticsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // ── POI state ──
  const [selectedCategory, setSelectedCategory] = useState<PoiCategory | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [geoFilter, setGeoFilter] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedPoiId, setSelectedPoiId] = useState<string | undefined>();

  const debouncedSetSearch = useDebouncedCallback((val: string) => {
    setSearchQuery(val);
  }, 300);

  const poiFilters = useMemo(
    () => ({
      category: selectedCategory,
      q: searchQuery || undefined,
      lat: geoFilter?.lat,
      lng: geoFilter?.lng,
      radius: geoFilter ? 50000 : undefined,
      limit: 100,
    }),
    [selectedCategory, searchQuery, geoFilter],
  );
  const { data: poisData, isLoading: poisLoading } = usePois(poiFilters);
  const { data: selectedPoi } = usePoi(selectedPoiId);

  // ── Carpool state ──
  const [originArea, setOriginArea] = useState<string>('');
  const [destArea, setDestArea] = useState<string>('');
  const [rideDate, setRideDate] = useState<string>('');
  const [showMyRides, setShowMyRides] = useState(false);

  const carpoolFilters = useMemo(
    () => ({
      originLat: originArea ? findArea(originArea)?.lat : undefined,
      originLng: originArea ? findArea(originArea)?.lng : undefined,
      destinationLat: destArea ? findArea(destArea)?.lat : undefined,
      destinationLng: destArea ? findArea(destArea)?.lng : undefined,
      date: rideDate || undefined,
      limit: 50,
    }),
    [originArea, destArea, rideDate],
  );
  const { data: ridesData, isLoading: ridesLoading } = useRides(carpoolFilters);
  const { data: myRidesData } = useMyRides(isAuthenticated);

  // ── POI Map locations ──
  const poiLocations: MapLocation[] = (poisData?.data ?? []).map((poi) => ({
    id: poi.id,
    name: poi.nameAr,
    lat: poi.location.y,
    lng: poi.location.x,
    type: getCategoryLabel(poi.category),
    color: getCategoryColor(poi.category),
  }));

  const handleMarkerClick = useCallback((loc: MapLocation) => {
    setSelectedPoiId(String(loc.id));
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoFilter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error('لم نتمكن من تحديد موقعك'),
    );
  };

  const canSuggestPoi =
    isAuthenticated &&
    user &&
    [UserRole.RESIDENT, UserRole.GUIDE, UserRole.MERCHANT].includes(user.role);

  return (
    <Layout>
      <PageTransition>
        {/* Hero */}
        <PageHero image={heroLogistics} alt="الخريطة والتنقل">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <MapIcon className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">الخريطة والتنقل</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              الخريطة والتنقل
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              استكشف معالم الوادي الجديد وشارك رحلتك مع الآخرين
            </p>
          </SR>
        </PageHero>

        {/* Content */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="explore-map" className="w-full">
              <SR>
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-10 h-12 rounded-xl">
                  <TabsTrigger value="explore-map" className="rounded-lg text-sm font-semibold">
                    <MapIcon className="h-4 w-4 ml-2" />
                    استكشف الخريطة
                  </TabsTrigger>
                  <TabsTrigger value="carpool" className="rounded-lg text-sm font-semibold">
                    <Car className="h-4 w-4 ml-2" />
                    مشاركة الرحلات
                  </TabsTrigger>
                </TabsList>
              </SR>

              {/* ── Explore Map Tab ── */}
              <TabsContent value="explore-map" className="space-y-6">
                {/* Filters */}
                <SR>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن مكان..."
                        onChange={(e) => debouncedSetSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleNearMe}>
                      <LocateFixed className="h-4 w-4 ml-1" />
                      بالقرب مني
                    </Button>
                    {geoFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setGeoFilter(undefined)}>
                        إلغاء الموقع
                      </Button>
                    )}
                    {canSuggestPoi && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info('ميزة اقتراح الأماكن قريباً')}
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        اقترح مكان
                      </Button>
                    )}
                  </div>
                </SR>

                {/* Category chips */}
                <SR delay={100}>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={!selectedCategory ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(undefined)}
                    >
                      الكل
                    </Badge>
                    {POI_CATEGORIES.map((cat) => (
                      <Badge
                        key={cat.value}
                        variant={selectedCategory === cat.value ? 'default' : 'outline'}
                        className="cursor-pointer"
                        style={
                          selectedCategory === cat.value
                            ? { backgroundColor: cat.color, borderColor: cat.color }
                            : {}
                        }
                        onClick={() =>
                          setSelectedCategory(
                            selectedCategory === cat.value ? undefined : cat.value,
                          )
                        }
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </SR>

                {/* Map */}
                <SR delay={200}>
                  {poisLoading ? (
                    <Skeleton h="h-[500px]" className="rounded-xl" />
                  ) : (
                    <InteractiveMap
                      locations={poiLocations}
                      className="h-[500px] w-full rounded-xl"
                      onMarkerClick={handleMarkerClick}
                      fitBounds={poiLocations.length > 0}
                    />
                  )}
                </SR>

                {/* Results count */}
                {poisData && (
                  <p className="text-sm text-muted-foreground">{poisData.total} نتيجة</p>
                )}

                {/* POI Detail Sheet */}
                <Sheet
                  open={!!selectedPoiId}
                  onOpenChange={(open) => !open && setSelectedPoiId(undefined)}
                >
                  <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    {selectedPoi && <PoiDetailContent poi={selectedPoi} />}
                  </SheetContent>
                </Sheet>
              </TabsContent>

              {/* ── Carpool Tab ── */}
              <TabsContent value="carpool" className="space-y-6">
                {/* Search filters */}
                <SR>
                  <div className="glass rounded-2xl p-5 md:p-7 shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Select value={originArea} onValueChange={setOriginArea}>
                        <SelectTrigger>
                          <SelectValue placeholder="من أين؟" />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_PRESETS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={destArea} onValueChange={setDestArea}>
                        <SelectTrigger>
                          <SelectValue placeholder="إلى أين؟" />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_PRESETS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nameAr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={rideDate}
                        onChange={(e) => setRideDate(e.target.value)}
                      />
                      <div className="flex gap-2">
                        {(originArea || destArea || rideDate) && (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setOriginArea('');
                              setDestArea('');
                              setRideDate('');
                            }}
                          >
                            مسح
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </SR>

                {/* Action buttons */}
                <SR delay={100}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-foreground">الرحلات المتاحة</h3>
                    <div className="flex gap-2">
                      {isAuthenticated && (
                        <Button variant="outline" onClick={() => setShowMyRides(true)}>
                          رحلاتي
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast.error('يجب تسجيل الدخول أولاً');
                            void navigate('/login');
                            return;
                          }
                          void navigate('/logistics/create-ride');
                        }}
                      >
                        <Car className="h-5 w-5 ml-2" />
                        أضف رحلتك
                      </Button>
                    </div>
                  </div>
                </SR>

                {/* Ride cards */}
                {ridesLoading ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} h="h-28" className="rounded-2xl" />)
                ) : (ridesData?.data ?? []).length === 0 ? (
                  <SR>
                    <div className="text-center py-16">
                      <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg text-muted-foreground">لا توجد رحلات متاحة</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => void navigate('/logistics/create-ride')}
                      >
                        كن أول من يضيف رحلة
                      </Button>
                    </div>
                  </SR>
                ) : (
                  (ridesData?.data ?? []).map((ride, idx) => (
                    <SR key={ride.id} delay={idx * 60}>
                      <RideCard
                        ride={ride}
                        onClick={() => void navigate(`/logistics/ride/${ride.id}`)}
                      />
                    </SR>
                  ))
                )}

                {/* My Rides Sheet */}
                <Sheet open={showMyRides} onOpenChange={setShowMyRides}>
                  <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>رحلاتي</SheetTitle>
                    </SheetHeader>
                    <MyRidesContent
                      data={myRidesData}
                      onViewRide={(id) => {
                        setShowMyRides(false);
                        void navigate(`/logistics/ride/${id}`);
                      }}
                    />
                  </SheetContent>
                </Sheet>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default LogisticsPage;

// ── Sub-Components ─────────────────────────────────────────────────

function PoiDetailContent({ poi }: { poi: Poi }) {
  return (
    <div className="space-y-6 pt-4">
      <SheetHeader>
        <SheetTitle className="text-xl">{poi.nameAr}</SheetTitle>
        {poi.nameEn && <p className="text-sm text-muted-foreground">{poi.nameEn}</p>}
      </SheetHeader>

      <Badge style={{ backgroundColor: getCategoryColor(poi.category) }} className="text-white">
        {getCategoryLabel(poi.category)}
      </Badge>

      {poi.description && <p className="text-foreground/80">{poi.description}</p>}

      <div className="space-y-3">
        {poi.address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <span>{poi.address}</span>
          </div>
        )}
        {poi.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${poi.phone}`} className="text-primary hover:underline">
              {poi.phone}
            </a>
          </div>
        )}
        {poi.website && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a
              href={poi.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate"
            >
              {poi.website}
            </a>
          </div>
        )}
      </div>

      {poi.ratingAvg && (
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{Number(poi.ratingAvg).toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({poi.ratingCount} تقييم)</span>
        </div>
      )}

      {poi.images && poi.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {poi.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`${poi.nameAr} ${i + 1}`}
              className="h-32 w-48 object-cover rounded-lg shrink-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RideCard({ ride, onClick }: { ride: CarpoolRide; onClick: () => void }) {
  const available = ride.seatsTotal - ride.seatsTaken;
  return (
    <Card
      className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 text-xl font-bold text-foreground mb-2">
              <span>{ride.originName}</span>
              <ArrowLeft className="h-6 w-6 text-primary" />
              <span>{ride.destinationName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDateTimeShort(ride.departureTime)}
              </div>
              <Badge variant="secondary">{available} مقاعد متاحة</Badge>
            </div>
            {ride.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{ride.notes}</p>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            {formatRidePrice(ride.pricePerSeat)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MyRidesContent({
  data,
  onViewRide,
}: {
  data: { asDriver: CarpoolRide[]; asPassenger: CarpoolPassenger[] } | undefined;
  onViewRide: (id: string) => void;
}) {
  if (!data) return <Skeleton h="h-20" className="mt-4" />;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h4 className="font-semibold mb-3">كسائق ({data.asDriver.length})</h4>
        {data.asDriver.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تنشئ أي رحلات بعد</p>
        ) : (
          <div className="space-y-2">
            {data.asDriver.map((ride) => (
              <Card
                key={ride.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewRide(ride.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {ride.originName} → {ride.destinationName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ride.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTimeShort(ride.departureTime)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold mb-3">كراكب ({data.asPassenger.length})</h4>
        {data.asPassenger.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تنضم لأي رحلات بعد</p>
        ) : (
          <div className="space-y-2">
            {data.asPassenger.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewRide(p.rideId)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm">{p.seats} مقعد</span>
                  <Badge variant="outline" className="text-xs">
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
