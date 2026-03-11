import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, MapPin, Clock, ArrowLeft, Bus, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logisticsAPI, type TransportRoute, type Station, type Carpool } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { PageHero } from '@/components/layout/PageHero';
import heroLogistics from '@/assets/hero-logistics.jpg';

const LogisticsPage = () => {
  const navigate = useNavigate();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [carpoolTrips, setCarpoolTrips] = useState<Carpool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      logisticsAPI.getRoutes().then((r) => setRoutes(r.data)),
      logisticsAPI.getStations().then((r) => setStations(r.data)),
      logisticsAPI.getCarpools().then((r) => setCarpoolTrips(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <PageTransition>
        {/* Hero Section */}
        <PageHero image={heroLogistics} alt="اللوجستيات والتنقل">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Bus className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">اللوجستيات والتنقل</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              اللوجستيات والتنقل
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              ابحث عن خطوط المواصلات، المحطات، أو شارك رحلتك مع الآخرين
            </p>
          </SR>

          {/* Search Form */}
          <SR delay={300}>
            <div className="glass rounded-2xl p-5 md:p-7 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="من أين؟"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    className="pr-12 h-14 rounded-xl text-base"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="إلى أين؟"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    className="pr-12 h-14 rounded-xl text-base"
                  />
                </div>
                <Button
                  size="lg"
                  className="h-14 rounded-xl text-base hover:scale-[1.02] transition-transform"
                >
                  <Search className="h-5 w-5 ml-2" />
                  بحث
                </Button>
              </div>
            </div>
          </SR>
        </PageHero>

        {/* Content Tabs */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="routes" className="w-full">
              <SR>
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-10 h-12 rounded-xl">
                  <TabsTrigger value="routes" className="rounded-lg text-sm font-semibold">
                    خطوط المواصلات
                  </TabsTrigger>
                  <TabsTrigger value="stations" className="rounded-lg text-sm font-semibold">
                    المحطات
                  </TabsTrigger>
                  <TabsTrigger value="carpool" className="rounded-lg text-sm font-semibold">
                    مشاركة الرحلات
                  </TabsTrigger>
                </TabsList>
              </SR>

              {/* Routes Tab */}
              <TabsContent value="routes" className="space-y-5">
                {loading
                  ? [1, 2, 3].map((i) => <Skeleton key={i} h="h-32" className="rounded-2xl" />)
                  : routes.map((route, idx) => (
                      <SR key={route.id} delay={idx * 60}>
                        <Card className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl">
                          <CardContent className="p-5 md:p-7">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                                    <Bus className="h-4 w-4" />
                                    {route.type}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {route.operator}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xl font-bold text-foreground">
                                  <span>{route.from}</span>
                                  <ArrowLeft className="h-6 w-6 text-primary" />
                                  <span>{route.to}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    {route.duration}
                                  </div>
                                  <div>المواعيد: {route.departures.join(' - ')}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between md:flex-col md:items-end gap-3">
                                <div className="text-3xl font-bold text-primary">
                                  {route.price} <span className="text-sm font-normal">جنيه</span>
                                </div>
                                <Button
                                  className="hover:scale-[1.03] transition-transform"
                                  onClick={() => void navigate(`/logistics/route/${route.id}`)}
                                >
                                  احجز الآن
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </SR>
                    ))}
              </TabsContent>

              {/* Stations Tab */}
              <TabsContent value="stations" className="space-y-4">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} h="h-36" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {stations.map((station) => (
                        <Card
                          key={station.id}
                          className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl"
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-foreground mb-1">
                                  {station.name}
                                </h3>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  {station.city}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-sm">
                                {station.routes} خطوط
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full mt-5 hover:scale-[1.01] transition-transform"
                              onClick={() => void navigate(`/logistics/station/${station.id}`)}
                            >
                              عرض التفاصيل
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SR>
                )}
              </TabsContent>

              {/* Carpool Tab */}
              <TabsContent value="carpool" className="space-y-5">
                <SR>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-foreground">الرحلات المتاحة</h3>
                    <Button
                      className="hover:scale-[1.03] transition-transform"
                      onClick={() => void navigate('/logistics/create-trip')}
                    >
                      <Car className="h-5 w-5 ml-2" />
                      أضف رحلتك
                    </Button>
                  </div>
                </SR>
                {loading
                  ? [1, 2, 3].map((i) => <Skeleton key={i} h="h-28" className="rounded-2xl" />)
                  : carpoolTrips.map((trip, idx) => (
                      <SR key={trip.id} delay={idx * 60}>
                        <Card className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl">
                          <CardContent className="p-5 md:p-7">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 text-xl font-bold text-foreground mb-2">
                                  <span>{trip.from}</span>
                                  <ArrowLeft className="h-6 w-6 text-primary" />
                                  <span>{trip.to}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <div>{trip.date}</div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    {trip.time}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-primary font-medium">
                                      ★ {trip.rating}
                                    </span>
                                    <span>• {trip.driver}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                                <div>
                                  <div className="text-3xl font-bold text-primary">
                                    {trip.price} <span className="text-sm font-normal">جنيه</span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {trip.seats} مقاعد متاحة
                                  </div>
                                </div>
                                <Button
                                  className="hover:scale-[1.03] transition-transform"
                                  onClick={() => void navigate(`/logistics/book/${trip.id}`)}
                                >
                                  احجز مقعد
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </SR>
                    ))}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default LogisticsPage;
