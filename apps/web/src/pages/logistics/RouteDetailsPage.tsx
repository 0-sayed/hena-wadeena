import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, MapPin, Clock, Bus, Calendar, Phone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';

// Mock route data
const routeData = {
  id: 1,
  from: 'الخارجة',
  to: 'القاهرة',
  type: 'باص',
  duration: '8 ساعات',
  distance: '600 كم',
  price: 250,
  operator: 'شركة الوادي للنقل',
  operatorPhone: '0927123456',
  departures: [
    { time: '6:00 ص', available: true },
    { time: '2:00 م', available: true },
    { time: '10:00 م', available: false },
  ],
  stops: [
    { name: 'محطة الخارجة المركزية', time: 'نقطة الانطلاق', lat: 25.45, lng: 30.55 },
    { name: 'محطة أسيوط', time: 'بعد 4 ساعات', lat: 27.1809, lng: 31.1837 },
    { name: 'محطة القاهرة (السلام)', time: 'نقطة الوصول', lat: 30.0444, lng: 31.2357 },
  ],
  notes: [
    'يُنصح بالحضور قبل الموعد بـ 30 دقيقة',
    'يُسمح بحقيبة واحدة كبيرة وحقيبة يد',
    'تتوفر وجبة خفيفة ومشروبات على متن الباص',
  ],
};

const RouteDetailsPage = () => {
  const navigate = useNavigate();
  useParams();

  const mapLocations = routeData.stops.map((stop, index) => ({
    id: index,
    name: stop.name,
    lat: stop.lat,
    lng: stop.lng,
    description: stop.time,
    type: 'محطة',
  }));

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/logistics')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للوجستيات
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="secondary" className="gap-1">
                      <Bus className="h-3.5 w-3.5" />
                      {routeData.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{routeData.operator}</span>
                  </div>

                  <div className="flex items-center gap-3 text-2xl font-bold mb-4">
                    <MapPin className="h-6 w-6 text-primary" />
                    <span>{routeData.from}</span>
                    <ArrowRight className="h-6 w-6 text-muted-foreground rotate-180" />
                    <span>{routeData.to}</span>
                  </div>

                  <div className="flex flex-wrap gap-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      <span>{routeData.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      <span>{routeData.distance}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">خريطة المسار</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-4 px-4">
                  <InteractiveMap
                    locations={mapLocations}
                    center={[27.5, 30.8]}
                    zoom={6}
                    className="h-[350px] w-full rounded-xl overflow-hidden"
                  />
                </CardContent>
              </Card>

              {/* Stops */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">محطات التوقف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {routeData.stops.map((stop, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-4 w-4 rounded-full ${
                              index === 0
                                ? 'bg-primary'
                                : index === routeData.stops.length - 1
                                  ? 'bg-accent'
                                  : 'bg-muted-foreground'
                            }`}
                          />
                          {index !== routeData.stops.length - 1 && (
                            <div className="w-0.5 h-8 bg-border" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{stop.name}</p>
                          <p className="text-sm text-muted-foreground">{stop.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    ملاحظات مهمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {routeData.notes.map((note, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-primary">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <Card className="border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">احجز رحلتك</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 bg-primary/5 rounded-lg">
                    <span className="text-3xl font-bold text-primary">{routeData.price}</span>
                    <span className="text-muted-foreground mr-1">جنيه</span>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-3">المواعيد المتاحة</p>
                    <div className="space-y-2">
                      {routeData.departures.map((dep, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            dep.available
                              ? 'border-border hover:border-primary cursor-pointer'
                              : 'border-border/50 bg-muted/50 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{dep.time}</span>
                          </div>
                          {dep.available ? (
                            <Badge variant="outline" className="text-primary border-primary">
                              متاح
                            </Badge>
                          ) : (
                            <Badge variant="secondary">ممتلئ</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void navigate('/logistics/book/1')}
                  >
                    احجز الآن
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                    <Phone className="h-4 w-4" />
                    <span>للاستفسار: {routeData.operatorPhone}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default RouteDetailsPage;
