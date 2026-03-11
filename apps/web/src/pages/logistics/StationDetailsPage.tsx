import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, ArrowLeft, MapPin, Clock, Bus, Phone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';

const stationsData: Record<
  string,
  {
    id: number;
    name: string;
    city: string;
    routes: number;
    lat: number;
    lng: number;
    address: string;
    phone: string;
    workingHours: string;
    facilities: string[];
    availableRoutes: {
      to: string;
      duration: string;
      price: number;
      type: string;
      departures: string[];
    }[];
  }
> = {
  '1': {
    id: 1,
    name: 'محطة الخارجة المركزية',
    city: 'الخارجة',
    routes: 8,
    lat: 25.45,
    lng: 30.55,
    address: 'شارع الجمهورية، وسط مدينة الخارجة',
    phone: '0927123456',
    workingHours: 'يومياً 24 ساعة',
    facilities: [
      'قاعة انتظار مكيفة',
      'حمامات عامة',
      'مقهى ومطعم',
      'موقف سيارات',
      'خدمة واي فاي',
      'شحن الهاتف',
    ],
    availableRoutes: [
      {
        to: 'القاهرة',
        duration: '8 ساعات',
        price: 250,
        type: 'باص',
        departures: ['6:00 ص', '2:00 م', '10:00 م'],
      },
      {
        to: 'أسيوط',
        duration: '5 ساعات',
        price: 150,
        type: 'باص',
        departures: ['7:00 ص', '3:00 م'],
      },
      {
        to: 'الأقصر',
        duration: '6 ساعات',
        price: 180,
        type: 'باص',
        departures: ['5:00 ص', '1:00 م'],
      },
      {
        to: 'الداخلة',
        duration: '3 ساعات',
        price: 80,
        type: 'ميكروباص',
        departures: ['كل ساعة من 6 ص إلى 6 م'],
      },
    ],
  },
  '2': {
    id: 2,
    name: 'محطة الداخلة',
    city: 'الداخلة',
    routes: 5,
    lat: 25.4867,
    lng: 29.0,
    address: 'شارع التحرير، مدينة موط، الداخلة',
    phone: '0927654321',
    workingHours: 'يومياً 6 ص - 12 م',
    facilities: ['قاعة انتظار', 'حمامات عامة', 'كافيتريا', 'موقف سيارات'],
    availableRoutes: [
      {
        to: 'أسيوط',
        duration: '5 ساعات',
        price: 150,
        type: 'باص',
        departures: ['7:00 ص', '3:00 م'],
      },
      {
        to: 'الخارجة',
        duration: '3 ساعات',
        price: 80,
        type: 'ميكروباص',
        departures: ['كل ساعة من 6 ص إلى 6 م'],
      },
      {
        to: 'الفرافرة',
        duration: '4 ساعات',
        price: 100,
        type: 'ميكروباص',
        departures: ['8:00 ص', '2:00 م'],
      },
    ],
  },
  '3': {
    id: 3,
    name: 'محطة الفرافرة',
    city: 'الفرافرة',
    routes: 4,
    lat: 27.0584,
    lng: 28.0236,
    address: 'وسط مدينة الفرافرة',
    phone: '0927111222',
    workingHours: 'يومياً 6 ص - 10 م',
    facilities: ['قاعة انتظار', 'حمامات عامة', 'بوفيه'],
    availableRoutes: [
      {
        to: 'الواحات البحرية',
        duration: '4 ساعات',
        price: 100,
        type: 'ميكروباص',
        departures: ['8:00 ص', '4:00 م'],
      },
      {
        to: 'الداخلة',
        duration: '4 ساعات',
        price: 100,
        type: 'ميكروباص',
        departures: ['8:00 ص', '2:00 م'],
      },
    ],
  },
  '4': {
    id: 4,
    name: 'محطة باريس',
    city: 'باريس',
    routes: 3,
    lat: 25.34,
    lng: 30.58,
    address: 'مدخل مدينة باريس',
    phone: '0927333444',
    workingHours: 'يومياً 7 ص - 8 م',
    facilities: ['قاعة انتظار', 'حمامات عامة'],
    availableRoutes: [
      {
        to: 'الخارجة',
        duration: 'ساعة واحدة',
        price: 30,
        type: 'ميكروباص',
        departures: ['كل ساعة من 7 ص إلى 7 م'],
      },
    ],
  },
};

const defaultStation = stationsData['1'];

const StationDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const station = stationsData[id || '1'] || defaultStation;

  const mapLocations = [
    {
      id: station.id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      description: station.address,
      type: 'محطة',
    },
  ];

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
              {/* Header */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bus className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2">{station.name}</h1>
                      <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{station.address}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {station.routes} خطوط نقل
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Routes */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">الخطوط المتاحة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {station.availableRoutes.map((route, index) => (
                    <div
                      key={index}
                      className="border border-border/50 rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="gap-1">
                              <Bus className="h-3 w-3" />
                              {route.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <span>{station.city}</span>
                            <ArrowLeft className="h-5 w-5 text-primary" />
                            <span>{route.to}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {route.duration}
                            </div>
                            <div>المواعيد: {route.departures.join(' - ')}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                          <div className="text-2xl font-bold text-primary">
                            {route.price} <span className="text-sm font-normal">جنيه</span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => void navigate(`/logistics/route/${index + 1}`)}
                          >
                            تفاصيل الخط
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">موقع المحطة</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-4 px-4">
                  <InteractiveMap
                    locations={mapLocations}
                    center={[station.lat, station.lng]}
                    zoom={14}
                    className="h-[300px] w-full rounded-xl overflow-hidden"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Station Info */}
              <Card className="border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات المحطة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">ساعات العمل</p>
                        <p className="text-sm font-medium">{station.workingHours}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">للاستفسار</p>
                        <p className="text-sm font-medium" dir="ltr">
                          {station.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium">المرافق المتاحة</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {station.facilities.map((facility) => (
                        <Badge key={facility} variant="outline" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => alert(`للاستفسار اتصل: ${station.phone}`)}
                  >
                    <Phone className="h-5 w-5 ml-2" />
                    اتصل بالمحطة
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StationDetailsPage;
