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
import type { AppLanguage } from '@/lib/localization';
import { pickLocalizedCopy, pickLocalizedField } from '@/lib/localization';
import { useDebouncedCallback } from '@/hooks/use-debounce';
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
import heroLogistics from '@/assets/hero-logistics.jpg';

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

const poiCategoryLabelsEn: Record<PoiCategory, string> = {
  historical: 'Historical',
  natural: 'Natural',
  religious: 'Religious',
  recreational: 'Recreational',
  accommodation: 'Accommodation',
  restaurant: 'Restaurant',
  service: 'Services',
  government: 'Government',
};

const rideStatusLabels: Record<CarpoolRide['status'], { ar: string; en: string }> = {
  open: { ar: 'متاحة', en: 'Open' },
  full: { ar: 'مكتملة المقاعد', en: 'Full' },
  departed: { ar: 'غادرت', en: 'Departed' },
  completed: { ar: 'مكتملة', en: 'Completed' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' },
};

const passengerStatusLabels: Record<CarpoolPassenger['status'], { ar: string; en: string }> = {
  requested: { ar: 'بانتظار التأكيد', en: 'Pending confirmation' },
  confirmed: { ar: 'مؤكد', en: 'Confirmed' },
  declined: { ar: 'مرفوض', en: 'Declined' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

function getCategoryColor(category: PoiCategory): string {
  return POI_CATEGORIES.find((c) => c.value === category)?.color ?? '#6b7280';
}

function getCategoryLabel(category: PoiCategory, language: AppLanguage = 'ar'): string {
  const arabicLabel = POI_CATEGORIES.find((c) => c.value === category)?.label;

  if (!arabicLabel) {
    return category;
  }

  return language === 'en' ? (poiCategoryLabelsEn[category] ?? category) : arabicLabel;
}

function getRideStatusLabel(status: CarpoolRide['status'], language: AppLanguage): string {
  return pickLocalizedCopy(language, rideStatusLabels[status] ?? { ar: status, en: status });
}

function getPassengerStatusLabel(
  status: CarpoolPassenger['status'],
  language: AppLanguage,
): string {
  return pickLocalizedCopy(language, passengerStatusLabels[status] ?? { ar: status, en: status });
}

// ── Main Component ─────────────────────────────────────────────────

const LogisticsPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, direction, language: appLanguage } = useAuth();
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
  const poiLocations: MapLocation[] = (poisData?.data ?? []).map((poi) => ({
    id: poi.id,
    name: pickLocalizedField(appLanguage, {
      ar: poi.nameAr,
      en: poi.nameEn,
    }),
    lat: poi.location.y,
    lng: poi.location.x,
    type: getCategoryLabel(poi.category, appLanguage),
    color: getCategoryColor(poi.category),
    image: poi.images?.[0],
  }));

  const handleMarkerClick = useCallback((loc: MapLocation) => {
    setSelectedPoiId(String(loc.id));
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'المتصفح لا يدعم تحديد الموقع',
          en: 'Your browser does not support location access',
        }),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setGeoFilter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () =>
        toast.error(
          pickLocalizedCopy(appLanguage, {
            ar: 'لم نتمكن من تحديد موقعك',
            en: 'We could not determine your location',
          }),
        ),
    );

    return;
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
      onSuccess: () =>
        toast.success(
          pickLocalizedCopy(appLanguage, {
            ar: 'تم إلغاء الرحلة',
            en: 'Ride cancelled',
          }),
        ),
      onError: (error) => toast.error(error.message),
    });

    return;
    cancelRide.mutate(rideId, {
      onSuccess: () => toast.success('تم إلغاء الرحلة'),
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

    return;
    activateRide.mutate(rideId, {
      onSuccess: () => toast.success('تمت إعادة تفعيل الرحلة'),
      onError: (error) => toast.error(error.message),
    });
  };

  const handleDeleteRide = (rideId: string) => {
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

    return;
    if (!window.confirm('هل تريد حذف هذه الرحلة نهائياً؟')) {
      return;
    }

    deleteRide.mutate(rideId, {
      onSuccess: () => toast.success('تم حذف الرحلة'),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Layout>
      <PageTransition>
        {/* Hero */}
        <PageHero
          image={heroLogistics}
          alt={pickLocalizedCopy(appLanguage, {
            ar: 'الخريطة والتنقل',
            en: 'Maps & transport',
          })}
        >
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <MapIcon className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'الخريطة والتنقل',
                  en: 'Maps & transport',
                })}
              </span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              {pickLocalizedCopy(appLanguage, {
                ar: 'الخريطة والتنقل',
                en: 'Maps & transport',
              })}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              {pickLocalizedCopy(appLanguage, {
                ar: 'استكشف معالم الوادي الجديد وشارك رحلتك مع الآخرين',
                en: 'Discover New Valley landmarks and share your trip with others',
              })}
            </p>
          </SR>
        </PageHero>

        {/* Content */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="explore-map" className="w-full">
              <SR>
                <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-3 mb-10 h-12 rounded-xl">
                  <TabsTrigger value="explore-map" className="rounded-lg text-sm font-semibold">
                    <MapIcon className="h-4 w-4 ml-2" />
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'استكشف الخريطة',
                      en: 'Explore the map',
                    })}
                  </TabsTrigger>
                  <TabsTrigger value="carpool" className="rounded-lg text-sm font-semibold">
                    <Car className="h-4 w-4 ml-2" />
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'مشاركة الرحلات',
                      en: 'Carpool rides',
                    })}
                  </TabsTrigger>
                  <TabsTrigger value="local-transport" className="rounded-lg text-sm font-semibold">
                    <Car className="h-4 w-4 ml-2" />
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'النقل المحلي',
                      en: 'Local transport',
                    })}
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
                        placeholder={pickLocalizedCopy(appLanguage, {
                          ar: 'ابحث عن مكان...',
                          en: 'Search for a place...',
                        })}
                        onChange={(e) => debouncedSetSearch(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleNearMe}>
                      <LocateFixed className="h-4 w-4 ml-1" />
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'بالقرب مني',
                        en: 'Nearby',
                      })}
                    </Button>
                    {geoFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setGeoFilter(undefined)}>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'إلغاء الموقع',
                          en: 'Clear location',
                        })}
                      </Button>
                    )}
                    {canSuggestPoi && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toast.info(
                            pickLocalizedCopy(appLanguage, {
                              ar: 'ميزة اقتراح الأماكن قريباً',
                              en: 'Place suggestions are coming soon',
                            }),
                          )
                        }
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'اقترح مكان',
                          en: 'Suggest a place',
                        })}
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
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'الكل',
                        en: 'All',
                      })}
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
                        {getCategoryLabel(cat.value, appLanguage)}
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
                  <p className="text-sm text-muted-foreground">
                    {pickLocalizedCopy(appLanguage, {
                      ar: `${poisData.total} نتيجة`,
                      en: `${poisData.total} results`,
                    })}
                  </p>
                )}

                {/* POI Detail Sheet */}
                <Sheet
                  open={!!selectedPoiId}
                  onOpenChange={(open) => !open && setSelectedPoiId(undefined)}
                >
                  <SheetContent side={sheetSide} className="w-full sm:max-w-lg overflow-y-auto">
                    {selectedPoi && <PoiDetailContent poi={selectedPoi} appLanguage={appLanguage} />}
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
                          <SelectValue
                            placeholder={pickLocalizedCopy(appLanguage, {
                              ar: 'من أين؟',
                              en: 'Where from?',
                            })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_PRESETS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getAreaDisplayName(a, appLanguage)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={destArea} onValueChange={setDestArea}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={pickLocalizedCopy(appLanguage, {
                              ar: 'إلى أين؟',
                              en: 'Where to?',
                            })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {AREA_PRESETS.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getAreaDisplayName(a, appLanguage)}
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
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'مسح',
                              en: 'Clear',
                            })}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </SR>

                {/* Action buttons */}
                <SR delay={100}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-foreground">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'الرحلات المتاحة',
                        en: 'Available rides',
                      })}
                    </h3>
                    <div className="flex gap-2">
                      {isAuthenticated && (
                        <Button variant="outline" onClick={() => setShowMyRides(true)}>
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'رحلاتي',
                            en: 'My rides',
                          })}
                        </Button>
                      )}
                      <CanAccess roles={RIDE_CREATOR_ROLES}>
                        <Button
                          onClick={() => {
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
                            void navigate('/logistics/create-ride');
                          }}
                        >
                          <Car className="h-5 w-5 ml-2" />
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'أضف رحلتك',
                            en: 'Add your ride',
                          })}
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
                      <p className="text-lg text-muted-foreground">
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'لا توجد رحلات متاحة',
                          en: 'No rides available right now',
                        })}
                      </p>
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
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'كن أول من يضيف رحلة',
                            en: 'Be the first to add a ride',
                          })}
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
                        appLanguage={appLanguage}
                        actions={
                          user?.id === ride.driverId ? (
                            <RideManagementActions
                              ride={ride}
                              onCancel={handleCancelRide}
                              onActivate={handleActivateRide}
                              onDelete={handleDeleteRide}
                              appLanguage={appLanguage}
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
                      <SheetTitle>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'رحلاتي',
                          en: 'My rides',
                        })}
                      </SheetTitle>
                    </SheetHeader>
                    <MyRidesContent
                      data={filteredMyRidesData}
                      appLanguage={appLanguage}
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
  appLanguage,
}: {
  poi: Poi;
  appLanguage: AppLanguage;
}) {
  const poiName = pickLocalizedField(appLanguage, {
    ar: poi.nameAr,
    en: poi.nameEn,
  });
  const secondaryName = appLanguage === 'ar' ? poi.nameEn?.trim() ?? null : null;

  return (
    <div className="space-y-6 pt-4">
      <SheetHeader>
        <SheetTitle className="text-xl">{poiName}</SheetTitle>
        {secondaryName && <p className="text-sm text-muted-foreground">{secondaryName}</p>}
      </SheetHeader>

      <Badge style={{ backgroundColor: getCategoryColor(poi.category) }} className="text-white">
        {getCategoryLabel(poi.category, appLanguage)}
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
              <LtrText>{poi.phone}</LtrText>
            </a>
          </div>
        )}
        {(() => {
          if (!poi.website) return null;
          try {
            const normalized = /^https?:\/\//i.test(poi.website)
              ? poi.website
              : `https://${poi.website}`;
            const url = new URL(normalized);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
            return (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={url.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  <LtrText>{poi.website}</LtrText>
                </a>
              </div>
            );
          } catch {
            return null;
          }
        })()}
      </div>

      {poi.ratingAvg && (
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{Number(poi.ratingAvg).toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: `(${poi.ratingCount} تقييم)`,
              en: `(${poi.ratingCount} reviews)`,
            })}
          </span>
        </div>
      )}

      {poi.images && poi.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {poi.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`${poiName} ${i + 1}`}
              className="h-32 w-48 object-cover rounded-lg shrink-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RideManagementActions({
  ride,
  onCancel,
  onActivate,
  onDelete,
  appLanguage,
  disabled = false,
}: {
  ride: CarpoolRide;
  onCancel: (rideId: string) => void;
  onActivate: (rideId: string) => void;
  onDelete: (rideId: string) => void;
  appLanguage: AppLanguage;
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
          {pickLocalizedCopy(appLanguage, {
            ar: 'إلغاء الرحلة',
            en: 'Cancel ride',
          })}
        </Button>
      )}
      {ride.status === 'cancelled' && (
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onActivate(ride.id)}>
          {pickLocalizedCopy(appLanguage, {
            ar: 'إعادة التفعيل',
            en: 'Reactivate',
          })}
        </Button>
      )}
      {canDelete && (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onDelete(ride.id)}>
          {pickLocalizedCopy(appLanguage, {
            ar: 'حذف الرحلة',
            en: 'Delete ride',
          })}
        </Button>
      )}
    </div>
  );
}

function RideCard({
  ride,
  onClick,
  actions,
  appLanguage,
}: {
  ride: CarpoolRide;
  onClick: () => void;
  actions?: ReactNode;
  appLanguage: AppLanguage;
}) {
  const available = ride.seatsTotal - ride.seatsTaken;
  const originName = localizeAreaName(ride.originName, appLanguage);
  const destinationName = localizeAreaName(ride.destinationName, appLanguage);
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
                {formatDateTimeShort(ride.departureTime, appLanguage)}
              </div>
              <Badge variant="secondary">
                {pickLocalizedCopy(appLanguage, {
                  ar: `${available} مقاعد متاحة`,
                  en: `${available} seats available`,
                })}
              </Badge>
            </div>
            {ride.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{ride.notes}</p>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            {formatRidePrice(ride.pricePerSeat, appLanguage)}
          </div>
        </div>
        {actions && <div className="mt-4 border-t pt-4">{actions}</div>}
      </CardContent>
    </Card>
  );
}

function MyRidesContent({
  data,
  appLanguage,
  onViewRide,
}: {
  data: { asDriver: CarpoolRide[]; asPassenger: CarpoolPassenger[] } | undefined;
  appLanguage: AppLanguage;
  onViewRide: (id: string) => void;
}) {
  if (!data) return <Skeleton h="h-20" className="mt-4" />;

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h4 className="font-semibold mb-3">
          {pickLocalizedCopy(appLanguage, {
            ar: `كسائق (${data.asDriver.length})`,
            en: `As driver (${data.asDriver.length})`,
          })}
        </h4>
        {data.asDriver.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'لم تنشئ أي رحلات بعد',
              en: 'You have not created any rides yet',
            })}
          </p>
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
                      {localizeAreaName(ride.originName, appLanguage)}
                      {' -> '}
                      {localizeAreaName(ride.destinationName, appLanguage)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getRideStatusLabel(ride.status, appLanguage)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTimeShort(ride.departureTime, appLanguage)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold mb-3">
          {pickLocalizedCopy(appLanguage, {
            ar: `كراكب (${data.asPassenger.length})`,
            en: `As passenger (${data.asPassenger.length})`,
          })}
        </h4>
        {data.asPassenger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'لم تنضم لأي رحلات بعد',
              en: 'You have not joined any rides yet',
            })}
          </p>
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
                    {pickLocalizedCopy(appLanguage, {
                      ar: `${p.seats} مقعد`,
                      en: `${p.seats} ${p.seats === 1 ? 'seat' : 'seats'}`,
                    })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getPassengerStatusLabel(p.status, appLanguage)}
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
