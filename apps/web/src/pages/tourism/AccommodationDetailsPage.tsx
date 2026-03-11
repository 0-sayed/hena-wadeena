import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  MapPin,
  Home,
  Wifi,
  Wind,
  Utensils,
  Car,
  Phone,
  Mail,
  MessageSquare,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';

// Mock data
const accommodationData = {
  id: 1,
  title: 'شقة مفروشة - الخارجة',
  type: 'شقة',
  price: 1500,
  priceUnit: 'شهرياً',
  rooms: 2,
  bathrooms: 1,
  area: '80 م²',
  location: 'حي الزهور، الخارجة',
  lat: 25.45,
  lng: 30.55,
  description: `
    شقة مفروشة بالكامل في موقع متميز بحي الزهور، على بعد 5 دقائق من جامعة الوادي الجديد.
    
    الشقة مناسبة للطلاب والموظفين، وتتميز بإطلالة جميلة وهدوء تام.
    
    متاحة للإيجار الشهري أو السنوي.
  `,
  amenities: [
    { icon: 'wind', name: 'مكيفة' },
    { icon: 'wifi', name: 'إنترنت' },
    { icon: 'utensils', name: 'مطبخ مجهز' },
    { icon: 'car', name: 'موقف سيارة' },
  ],
  forStudents: true,
  images: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  ],
  rules: [
    'عقد إيجار رسمي',
    'تأمين شهر مقدماً',
    'مناسب للعائلات والأفراد',
    'ممنوع الحيوانات الأليفة',
  ],
  owner: {
    name: 'محمد حسن',
    phone: '01012345678',
    email: 'owner@email.com',
  },
  nearbyPlaces: [
    { name: 'جامعة الوادي الجديد', distance: '5 دقائق' },
    { name: 'السوق المركزي', distance: '10 دقائق' },
    { name: 'المستشفى العام', distance: '15 دقيقة' },
  ],
};

const AmenityIcon = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'wind':
      return <Wind className="h-5 w-5" />;
    case 'wifi':
      return <Wifi className="h-5 w-5" />;
    case 'utensils':
      return <Utensils className="h-5 w-5" />;
    case 'car':
      return <Car className="h-5 w-5" />;
    default:
      return <Home className="h-5 w-5" />;
  }
};

const AccommodationDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const mapLocations = [
    {
      id: 1,
      name: accommodationData.title,
      lat: accommodationData.lat,
      lng: accommodationData.lng,
      description: accommodationData.location,
      type: 'سكن',
    },
  ];

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/tourism')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للسكن
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <img
                    src={accommodationData.images[0]}
                    alt={accommodationData.title}
                    className="w-full h-64 md:h-80 object-cover rounded-xl"
                  />
                </div>
                {accommodationData.images.slice(1).map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${accommodationData.title} ${index + 2}`}
                    className="w-full h-40 object-cover rounded-xl"
                  />
                ))}
              </div>

              {/* Header */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge variant="secondary">{accommodationData.type}</Badge>
                    {accommodationData.forStudents && (
                      <Badge className="bg-accent text-accent-foreground">
                        <GraduationCap className="h-3 w-3 ml-1" />
                        مناسب للطلاب
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {accommodationData.title}
                  </h1>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>{accommodationData.location}</span>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-sm">
                    <span>{accommodationData.rooms} غرف</span>
                    <span>{accommodationData.bathrooms} حمام</span>
                    <span>{accommodationData.area}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">وصف السكن</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {accommodationData.description}
                  </p>
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">المميزات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {accommodationData.amenities.map((amenity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="text-primary">
                          <AmenityIcon icon={amenity.icon} />
                        </div>
                        <span className="font-medium">{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rules */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">شروط الإيجار</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {accommodationData.rules.map((rule, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-primary">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">الموقع</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-4 px-4">
                  <InteractiveMap
                    locations={mapLocations}
                    center={[accommodationData.lat, accommodationData.lng]}
                    zoom={14}
                    className="h-[300px] w-full rounded-xl overflow-hidden"
                  />
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-foreground">الأماكن القريبة:</p>
                    {accommodationData.nearbyPlaces.map((place, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{place.name}</span>
                        <span>{place.distance}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Price Card */}
              <Card className="border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل السعر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4 bg-primary/5 rounded-lg">
                    <span className="text-3xl font-bold text-primary">
                      {accommodationData.price}
                    </span>
                    <span className="text-muted-foreground mr-1">
                      جنيه/{accommodationData.priceUnit}
                    </span>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void navigate(`/tourism/accommodation-inquiry/${id}`)}
                  >
                    <MessageSquare className="h-5 w-5 ml-2" />
                    استفسار عن السكن
                  </Button>

                  <div className="pt-4 border-t border-border space-y-3">
                    <p className="text-sm font-medium">تواصل مباشر:</p>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>{accommodationData.owner.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>{accommodationData.owner.email}</span>
                    </div>
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

export default AccommodationDetailsPage;
