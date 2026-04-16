import { type ReactNode, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { CanAccess } from '@/components/auth/CanAccess';
import { PageHero } from '@/components/layout/PageHero';
import { PageTransition } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { Skeleton } from '@/components/motion/Skeleton';
import { LocalTransportTab } from '@/components/logistics/LocalTransportTab';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import type { MapLocation } from '@/components/maps/InteractiveMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LtrText } from '@/components/ui/ltr-text';
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
  Bus,
  Map as MapIcon,
  Search,
  LocateFixed,
  ArrowLeft,
  Phone,
  Globe,
  Star,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { formatRidePrice } from '@/lib/format';
import { formatDateTimeShort } from '@/lib/dates';
import { buildGoogleMapsLocationUrl } from '@/lib/maps';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import {
  usePois,
  usePoi,
  useRides,
  useMyRides,
  useActivateRide,
  useCancelRide,
  useDeleteRide,
} from '@/hooks/use-map';

import type { Poi, PoiCategory, CarpoolRide, CarpoolPassenger } from '@/services/api';
import { UserRole } from '@hena-wadeena/types';
import { AREA_PRESETS, findArea, getAreaDisplayName, localizeAreaName } from '@/lib/area-presets';
import { toast } from 'sonner';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import heroLogistics from '@/assets/hero-logistics.webp';

const RIDE_CREATOR_ROLES = [UserRole.DRIVER, UserRole.ADMIN] as const;

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

function getCategoryLabel(
  category: PoiCategory,
  t: (key: string, options?: { defaultValue: string }) => string,
): string {
  return t(`map.categories.${category}`, { defaultValue: category });
}

function getRideStatusLabel(
  status: CarpoolRide['status'],
  t: (key: string, options?: { defaultValue: string }) => string,
): string {
  return t(`rides.status.${status}`, { defaultValue: status });
}

function getPassengerStatusLabel(
  status: CarpoolPassenger['status'],
  t: (key: string, options?: { defaultValue: string }) => string,
): string {
  return t(`rides.passengerStatus.${status}`, { defaultValue: status });
}

// ── Main Component ─────────────────────────────────────────────────

const LogisticsPage = () => {
  const { t } = useTranslation('logistics');
  const navigate = useNavigate();
  const { user, isAuthenticated, direction, language } = useAuth();
  const sheetSide = direction === 'rtl' ? 'right' : 'left';

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
  const cancelRide = useCancelRide();
  const activateRide = useActivateRide();
  const deleteRide = useDeleteRide();

  // ── POI Map locations ──
  const poiLocations = useMemo<MapLocation[]>(
    () =>
      (poisData?.data ?? []).map((poi) => ({
        id: poi.id,
        name:
          ((language === 'en' ? 'en' : 'ar') === 'en' ? poi.nameEn : poi.nameAr) ??
          poi.nameAr ??
          '',
        lat: poi.location.y,
        lng: poi.location.x,
        type: getCategoryLabel(poi.category, t),
        color: getCategoryColor(poi.category),
        image: poi.images?.[0],
      })),
    [language, t, poisData],
  );

  const handleMarkerClick = useCallback((loc: MapLocation) => {
    setSelectedPoiId(String(loc.id));
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error(t('map.browserLocationError'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoFilter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error(t('map.detectLocationError')),
    );
  };

  const hasNoNearbyPois = Boolean(geoFilter && poisData && poisData.total === 0);

  const canSuggestPoi =
    isAuthenticated &&
    user &&
    [UserRole.RESIDENT, UserRole.GUIDE, UserRole.MERCHANT].includes(user.role);

  const filteredMyRidesData = useMemo(() => {
    if (!myRidesData) return undefined;

    const driverRideIds = new Set(myRidesData.asDriver.map((ride) => ride.id));

    return {
      ...myRidesData,
      asPassenger: myRidesData.asPassenger.filter((ride) => !driverRideIds.has(ride.rideId)),
    };
  }, [myRidesData]);

  const handleCancelRide = (rideId: string) => {
    cancelRide.mutate(rideId, {
      onSuccess: () => toast.success(t('rides.toasts.cancelled')),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleActivateRide = (rideId: string) => {
    activateRide.mutate(rideId, {
      onSuccess: () => toast.success(t('rides.toasts.reactivated')),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDeleteRide = (rideId: string) => {
    if (!window.confirm(t('rides.deleteConfirm'))) {
      return;
    }

    deleteRide.mutate(rideId, {
      onSuccess: () => toast.success(t('rides.toasts.deleted')),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Layout title={t('hero.title')}>
      <PageTransition>
        {/* Hero */}
        <PageHero image={heroLogistics} alt={t('hero.badge')}>
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <MapIcon className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">{t('hero.badge')}</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              {t('hero.title')}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">{t('hero.subtitle')}</p>
          </SR>
        </PageHero>

        {/* Content */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="explore-map" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-3xl grid-cols-3 rounded-2xl p-1 sm:mb-10 sm:h-12 sm:rounded-xl">
                  <TabsTrigger
                    value="explore-map"
                    className="min-h-[56px] flex-col gap-1 rounded-xl py-2 text-[11px] font-semibold leading-tight sm:min-h-[44px] sm:flex-row sm:gap-2 sm:text-sm"
                  >
                    <MapIcon className="h-4 w-4" />
                    {t('tabs.explore')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="carpool"
                    className="min-h-[56px] flex-col gap-1 rounded-xl py-2 text-[11px] font-semibold leading-tight sm:min-h-[44px] sm:flex-row sm:gap-2 sm:text-sm"
                  >
                    <Car className="h-4 w-4" />
                    {t('tabs.carpool')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="local-transport"
                    className="min-h-[56px] flex-col gap-1 rounded-xl py-2 text-[11px] font-semibold leading-tight sm:min-h-[44px] sm:flex-row sm:gap-2 sm:text-sm"
                  >
                    <Bus className="h-4 w-4" />
                    {t('tabs.transport')}
                  </TabsTrigger>
                </TabsList>
              </SR>

              {/* ── Explore Map Tab ── */}
              <TabsContent value="explore-map" className="space-y-6">
                {/* Filters */}
                <SR>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="search-inline-icon-md absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t('map.searchPlaceholder')}
                        onChange={(e) => debouncedSetSearch(e.target.value)}
                        className="search-input-with-icon-md h-12 rounded-xl md:h-12"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-12 w-full rounded-xl sm:w-auto"
                      onClick={handleNearMe}
                    >
                      <LocateFixed className="h-4 w-4" />
                      {t('map.nearbyBtn')}
                    </Button>
                    {geoFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-12 w-full rounded-xl sm:w-auto"
                        onClick={() => setGeoFilter(undefined)}
                      >
                        {t('map.clearLocationBtn')}
                      </Button>
                    )}
                    {canSuggestPoi && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-12 w-full rounded-xl sm:w-auto"
                        onClick={() => void navigate('/logistics/suggest-poi')}
                      >
                        <Plus className="h-4 w-4" />
                        {t('map.suggestPlaceBtn')}
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
                      {t('map.categories.all')}
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
                        {getCategoryLabel(cat.value, t)}
                      </Badge>
                    ))}
                  </div>
                </SR>

                {/* Map */}
                <SR delay={200}>
                  {poisLoading ? (
                    <Skeleton h="h-[500px]" className="rounded-xl" />
                  ) : (
                    <div className="relative overflow-hidden rounded-xl">
                      <InteractiveMap
                        locations={poiLocations}
                        className="h-[500px] w-full rounded-xl"
                        onMarkerClick={handleMarkerClick}
                        fitBounds={poiLocations.length > 0}
                        showGoogleMapsButton={false}
                        popupTrigger="both"
                      />
                      {hasNoNearbyPois && (
                        <div
                          data-testid="nearby-empty-overlay"
                          className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/55 px-6 backdrop-blur-[2px]"
                          aria-live="polite"
                        >
                          <div className="flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border/70 bg-background/80 px-6 py-7 text-center shadow-sm">
                            <MapPin className="h-10 w-10 text-muted-foreground/60" />
                            <p className="text-muted-foreground">{t('map.noNearbyFound')}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setGeoFilter(undefined)}
                            >
                              {t('map.clearLocationBtn')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SR>

                {/* Results count */}
                {poisData && (
                  <p className="text-sm text-muted-foreground">
                    {t('map.resultsCount', { count: poisData.total })}
                  </p>
                )}

                {/* POI Detail Sheet */}
                <Sheet
                  open={!!selectedPoiId}
                  onOpenChange={(open) => !open && setSelectedPoiId(undefined)}
                >
                  <SheetContent side={sheetSide} className="w-full sm:max-w-lg overflow-y-auto">
                    {selectedPoi && <PoiDetailContent poi={selectedPoi} t={t} />}
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
                          <SelectValue placeholder={t('form.from')} />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_PRESETS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getAreaDisplayName(a, language)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={destArea} onValueChange={setDestArea}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('form.to')} />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_PRESETS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getAreaDisplayName(a, language)}
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
                            {t('form.clear')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </SR>

                {/* Action buttons */}
                <SR delay={100}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-foreground">{t('rides.title')}</h3>
                    <div className="flex gap-2">
                      {isAuthenticated && (
                        <Button variant="outline" onClick={() => setShowMyRides(true)}>
                          {t('rides.myRidesBtn')}
                        </Button>
                      )}
                      <CanAccess roles={RIDE_CREATOR_ROLES}>
                        <Button
                          onClick={() => {
                            if (!isAuthenticated) {
                              toast.error(t('rides.loginRequiredToast'));
                              void navigate('/login');
                              return;
                            }
                            void navigate('/logistics/create-ride');
                          }}
                        >
                          <Car className="h-5 w-5" />
                          {t('rides.addRideBtn')}
                        </Button>
                      </CanAccess>
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
                      <p className="text-lg text-muted-foreground">{t('rides.emptyState')}</p>
                      <CanAccess roles={RIDE_CREATOR_ROLES}>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            if (!isAuthenticated) {
                              void navigate('/login');
                              return;
                            }
                            void navigate('/logistics/create-ride');
                          }}
                        >
                          {t('rides.beFirstBtn')}
                        </Button>
                      </CanAccess>
                    </div>
                  </SR>
                ) : (
                  (ridesData?.data ?? []).map((ride, idx) => (
                    <SR key={ride.id} delay={idx * 60}>
                      <RideCard
                        ride={ride}
                        onClick={() => void navigate(`/logistics/ride/${ride.id}`)}
                        language={language}
                        t={t}
                        actions={
                          user?.id === ride.driverId ? (
                            <RideManagementActions
                              ride={ride}
                              onCancel={handleCancelRide}
                              onActivate={handleActivateRide}
                              onDelete={handleDeleteRide}
                              t={t}
                              disabled={
                                cancelRide.isPending ||
                                activateRide.isPending ||
                                deleteRide.isPending
                              }
                            />
                          ) : undefined
                        }
                      />
                    </SR>
                  ))
                )}

                {/* My Rides Sheet */}
                <Sheet open={showMyRides} onOpenChange={setShowMyRides}>
                  <SheetContent side={sheetSide} className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>{t('rides.myRidesBtn')}</SheetTitle>
                    </SheetHeader>
                    <MyRidesContent
                      data={filteredMyRidesData}
                      language={language}
                      t={t}
                      onViewRide={(id) => {
                        setShowMyRides(false);
                        void navigate(`/logistics/ride/${id}`);
                      }}
                    />
                  </SheetContent>
                </Sheet>
              </TabsContent>

              <TabsContent value="local-transport">
                <SR>
                  <LocalTransportTab />
                </SR>
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

function PoiDetailContent({
  poi,
  t,
}: {
  poi: Poi;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { language } = useAuth();
  const appLanguage = language === 'en' ? 'en' : 'ar';
  const poiName = (appLanguage === 'en' ? poi.nameEn : poi.nameAr) ?? poi.nameAr ?? '';
  const secondaryName = appLanguage === 'ar' ? (poi.nameEn?.trim() ?? null) : null;
  const googleMapsUrl = buildGoogleMapsLocationUrl(poi.location.y, poi.location.x);
  const websiteLink = (() => {
    if (!poi.website) return null;
    try {
      const normalized = /^https?:\/\//i.test(poi.website) ? poi.website : `https://${poi.website}`;
      const url = new URL(normalized);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return {
        href: url.href,
        label: poi.website,
      };
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-5 pt-4">
      {poi.images?.[0] ? (
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-muted/30 shadow-sm">
          <img
            src={poi.images[0]}
            alt={poiName}
            className="h-52 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <SheetHeader className="space-y-2 text-start">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle className="text-2xl leading-tight">{poiName}</SheetTitle>
              {secondaryName ? (
                <p className="text-sm text-muted-foreground">{secondaryName}</p>
              ) : null}
            </div>
            <Badge
              style={{ backgroundColor: getCategoryColor(poi.category) }}
              className="rounded-full px-3 py-1 text-white shadow-sm"
            >
              {getCategoryLabel(poi.category, t)}
            </Badge>
          </div>
        </SheetHeader>

        {poi.description ? (
          <p className="text-sm leading-7 text-foreground/80">{poi.description}</p>
        ) : null}

        {poi.ratingAvg ? (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-amber-800">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-semibold">{Number(poi.ratingAvg).toFixed(1)}</span>
            <span className="text-sm">
              {t('map.poiDetails.reviews', { count: poi.ratingCount })}
            </span>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {poi.address ? (
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start gap-3 text-sm">
              <div className="rounded-full bg-muted p-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">{t('map.poiDetails.address')}</p>
                <p className="leading-6 text-muted-foreground">{poi.address}</p>
              </div>
            </div>
          </div>
        ) : null}

        {poi.phone ? (
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-full bg-muted p-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">{t('map.poiDetails.phone')}</p>
                <a href={`tel:${poi.phone}`} className="text-primary hover:underline">
                  <LtrText>{poi.phone}</LtrText>
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {websiteLink ? (
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-full bg-muted p-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-foreground">{t('map.poiDetails.website')}</p>
                <a
                  href={websiteLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-primary hover:underline"
                >
                  <LtrText>{websiteLink.label}</LtrText>
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" size="lg" asChild>
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {t('map.poiDetails.openInMaps')}
            </a>
          </Button>
          {websiteLink ? (
            <Button variant="outline" size="lg" className="flex-1" asChild>
              <a href={websiteLink.href} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
                {t('map.poiDetails.visitWebsite')}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RideManagementActions({
  ride,
  onCancel,
  onActivate,
  onDelete,
  t,
  disabled = false,
}: {
  ride: CarpoolRide;
  onCancel: (rideId: string) => void;
  onActivate: (rideId: string) => void;
  onDelete: (rideId: string) => void;
  t: (key: string) => string;
  disabled?: boolean;
}) {
  const canDelete = ride.status === 'cancelled' || ride.status === 'completed';

  if (ride.status !== 'open' && ride.status !== 'cancelled' && !canDelete) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
      {ride.status === 'open' && (
        <Button
          size="sm"
          variant="destructive"
          disabled={disabled}
          onClick={() => onCancel(ride.id)}
        >
          {t('rides.actions.cancel')}
        </Button>
      )}
      {ride.status === 'cancelled' && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onActivate(ride.id)}>
          {t('rides.actions.reactivate')}
        </Button>
      )}
      {canDelete && (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onDelete(ride.id)}>
          {t('rides.actions.delete')}
        </Button>
      )}
    </div>
  );
}

function RideCard({
  ride,
  onClick,
  actions,
  language,
  t,
}: {
  ride: CarpoolRide;
  onClick: () => void;
  actions?: ReactNode;
  language: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const available = ride.seatsTotal - ride.seatsTaken;
  const originName = localizeAreaName(ride.originName, language === 'en' ? 'en' : 'ar');
  const destinationName = localizeAreaName(ride.destinationName, language === 'en' ? 'en' : 'ar');
  return (
    <Card
      className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 text-xl font-bold text-foreground mb-2">
              <span>{originName}</span>
              <ArrowLeft className="h-6 w-6 text-primary" />
              <span>{destinationName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDateTimeShort(ride.departureTime, language === 'en' ? 'en' : 'ar')}
              </div>
              <Badge variant="secondary">{t('rides.seats', { count: available })}</Badge>
            </div>
            {ride.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{ride.notes}</p>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            {formatRidePrice(ride.pricePerSeat, language === 'en' ? 'en' : 'ar')}
          </div>
        </div>
        {actions && <div className="mt-4 border-t pt-4">{actions}</div>}
      </CardContent>
    </Card>
  );
}

function MyRidesContent({
  data,
  language,
  t,
  onViewRide,
}: {
  data: { asDriver: CarpoolRide[]; asPassenger: CarpoolPassenger[] } | undefined;
  language: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onViewRide: (id: string) => void;
}) {
  if (!data) return <Skeleton h="h-20" className="mt-4" />;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h4 className="font-semibold mb-3">
          {t('rides.userRides.asDriver', { count: data.asDriver.length })}
        </h4>
        {data.asDriver.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('rides.userRides.noDriverRides')}</p>
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
                      {localizeAreaName(ride.originName, language === 'en' ? 'en' : 'ar')}
                      {' -> '}
                      {localizeAreaName(ride.destinationName, language === 'en' ? 'en' : 'ar')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getRideStatusLabel(ride.status, t)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTimeShort(ride.departureTime, language === 'en' ? 'en' : 'ar')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold mb-3">
          {t('rides.userRides.asPassenger', { count: data.asPassenger.length })}
        </h4>
        {data.asPassenger.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('rides.userRides.noPassengerRides')}</p>
        ) : (
          <div className="space-y-2">
            {data.asPassenger.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewRide(p.rideId)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm">
                    {t('rides.userRides.passengerSeats', { count: p.seats })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getPassengerStatusLabel(p.status, t)}
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
