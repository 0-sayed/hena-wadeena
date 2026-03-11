import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, MapPin, Star, Clock, Calendar, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';

const attractionsData: Record<
  string,
  {
    id: number;
    title: string;
    description: string;
    fullDescription: string;
    image: string;
    rating: number;
    duration: string;
    type: string;
    location: string;
    lat: number;
    lng: number;
    highlights: string[];
    tips: string[];
    bestTime: string;
    entryFee: string;
  }
> = {
  '1': {
    id: 1,
    title: 'واحة الخارجة',
    description:
      'أكبر واحات الوادي الجديد، تضم آثاراً فرعونية ورومانية فريدة من معبد هيبس ومقابر البجوات',
    fullDescription: `تعد واحة الخارجة أكبر واحات الوادي الجديد وعاصمته الإدارية. تقع في قلب الصحراء الغربية وتضم مجموعة فريدة من المعالم الأثرية والتاريخية.

يعود تاريخ الاستيطان في الواحة إلى العصر الفرعوني، حيث كانت محطة رئيسية على طريق القوافل التجارية بين وادي النيل والسودان.

أبرز المعالم:
- معبد هيبس: المعبد الوحيد المكتمل من العصر الفارسي في مصر
- مقابر البجوات: أكبر مقبرة مسيحية قبطية في العالم (263 كنيسة صغيرة)
- قصر الزيّان: حصن روماني على الطريق التجاري القديم
- متحف الوادي الجديد: يضم مقتنيات من مختلف العصور`,
    image: 'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=800',
    rating: 4.8,
    duration: 'يوم كامل',
    type: 'أثري',
    location: 'الخارجة',
    lat: 25.45,
    lng: 30.55,
    highlights: [
      'معبد هيبس الفريد من نوعه',
      'مقابر البجوات المسيحية القديمة',
      'متحف الوادي الجديد',
      'أسواق تقليدية ومنتجات محلية',
      'موقع تراث عالمي محتمل',
    ],
    tips: [
      'يُنصح بالزيارة في الصباح الباكر لتجنب الحرارة',
      'احرص على إحضار ماء كافي وواقي شمس',
      'يمكنك استئجار مرشد محلي عند المدخل',
      'التصوير مسموح في معظم المواقع',
    ],
    bestTime: 'من أكتوبر إلى أبريل',
    entryFee: '80 جنيه مصري',
  },
  '2': {
    id: 2,
    title: 'الصحراء البيضاء',
    description: 'تشكيلات صخرية بيضاء ساحرة من الطباشير تحت سماء مليئة بالنجوم',
    fullDescription: `تعد الصحراء البيضاء من أروع المناظر الطبيعية في مصر والعالم. تقع بالقرب من واحة الفرافرة وتتميز بتشكيلاتها الصخرية البيضاء الساحرة المكونة من الطباشير.

تشكّلت هذه التكوينات على مدى ملايين السنين بفعل عوامل التعرية الطبيعية من رياح ورمال، لتخلق أشكالاً فنية مذهلة تشبه الفطر والأشجار والحيوانات.

تتحول الصحراء البيضاء عند غروب الشمس وشروقها إلى لوحة فنية خلابة، وفي الليل تتلألأ النجوم فوقها بشكل لا يُنسى.`,
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
    rating: 4.9,
    duration: '٢-٣ أيام',
    type: 'طبيعي',
    location: 'الفرافرة',
    lat: 27.0584,
    lng: 28.0236,
    highlights: [
      'تشكيلات صخرية بيضاء فريدة',
      'تجربة تخييم لا تُنسى',
      'مراقبة النجوم في سماء صافية',
      'رحلات سفاري ممتعة',
      'مناظر غروب وشروق ساحرة',
    ],
    tips: [
      'احجز رحلة سفاري مع مرشد محلي',
      'أحضر ملابس دافئة للليل - الصحراء باردة جداً',
      'يُنصح بالتخييم ليلة على الأقل',
      'احرص على وجود مياه ومؤن كافية',
    ],
    bestTime: 'من نوفمبر إلى مارس',
    entryFee: 'مجاني (تكلفة السفاري تبدأ من 500 جنيه)',
  },
  '3': {
    id: 3,
    title: 'عين السبيل',
    description: 'عين مياه ساخنة طبيعية للاسترخاء والعلاج الطبيعي',
    fullDescription: `عين السبيل هي ينبوع مياه حارة طبيعي يقع بالقرب من مدينة الخارجة. تتميز مياهها بدرجة حرارة مرتفعة ومحتوى معدني غني يجعلها مثالية للاستشفاء والعلاج الطبيعي.

تُستخدم هذه المياه منذ القدم في علاج أمراض الروماتيزم والأمراض الجلدية وآلام المفاصل. يزور العين سنوياً آلاف الزوار من داخل مصر وخارجها.

المنطقة المحيطة بالعين مجهزة بمرافق للاستحمام والاسترخاء، مع مناظر طبيعية خلابة.`,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    rating: 4.6,
    duration: 'نصف يوم',
    type: 'استشفائي',
    location: 'الخارجة',
    lat: 25.43,
    lng: 30.53,
    highlights: [
      'مياه كبريتية ذات فوائد صحية',
      'مرافق استحمام مجهزة',
      'أجواء استرخاء هادئة',
      'علاج طبيعي للروماتيزم',
    ],
    tips: [
      'أحضر منشفة وملابس للسباحة',
      'لا تبقَ في الماء الساخن أكثر من 20 دقيقة',
      'يُنصح بشرب ماء كافي قبل وبعد الاستحمام',
    ],
    bestTime: 'طوال العام',
    entryFee: '20 جنيه مصري',
  },
};

// Default fallback for IDs not in our mock data
const defaultAttraction = attractionsData['1'];

const AttractionDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const attraction = attractionsData[id || '1'] || defaultAttraction;

  const mapLocations = [
    {
      id: attraction.id,
      name: attraction.title,
      lat: attraction.lat,
      lng: attraction.lng,
      description: attraction.location,
      type: attraction.type,
    },
  ];

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/tourism/attractions')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للمعالم
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hero Image */}
              <div className="rounded-2xl overflow-hidden">
                <img
                  src={attraction.image}
                  alt={attraction.title}
                  className="w-full h-64 md:h-96 object-cover"
                />
              </div>

              {/* Header */}
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge className="bg-primary">{attraction.type}</Badge>
                    <div className="flex items-center gap-1 text-accent-foreground">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{attraction.rating}</span>
                    </div>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {attraction.title}
                  </h1>

                  <p className="text-lg text-muted-foreground mb-4">{attraction.description}</p>

                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>{attraction.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span>{attraction.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span>أفضل وقت: {attraction.bestTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Full Description */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">عن المعلم</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                    {attraction.fullDescription}
                  </p>
                </CardContent>
              </Card>

              {/* Highlights */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">أبرز المميزات</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attraction.highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{index + 1}</span>
                        </div>
                        <span className="text-muted-foreground">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">الموقع على الخريطة</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-4 px-4">
                  <InteractiveMap
                    locations={mapLocations}
                    center={[attraction.lat, attraction.lng]}
                    zoom={10}
                    className="h-[300px] w-full rounded-xl overflow-hidden"
                  />
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">نصائح للزائرين</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {attraction.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Visit Info */}
              <Card className="border-border/50 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-lg">معلومات الزيارة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">رسوم الدخول</p>
                    <p className="text-xl font-bold text-primary">{attraction.entryFee}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">المدة المقترحة</p>
                      <p className="font-semibold">{attraction.duration}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">أفضل وقت</p>
                      <p className="font-semibold text-sm">{attraction.bestTime}</p>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void navigate('/tourism/guide-booking/1')}
                  >
                    <Users className="h-5 w-5 ml-2" />
                    احجز مرشد سياحي
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void navigate('/tourism/attractions')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    استكشف معالم أخرى
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

export default AttractionDetailsPage;
