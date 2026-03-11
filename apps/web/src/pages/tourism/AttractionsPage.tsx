import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, Star, Clock, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const allAttractions = [
  {
    id: 1,
    title: 'واحة الخارجة',
    description:
      'أكبر واحات الوادي الجديد، تضم آثاراً فرعونية ورومانية فريدة من معبد هيبس ومقابر البجوات',
    image: 'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=800',
    rating: 4.8,
    duration: 'يوم كامل',
    type: 'أثري',
    location: 'الخارجة',
  },
  {
    id: 2,
    title: 'الصحراء البيضاء',
    description:
      'تشكيلات صخرية بيضاء ساحرة من الطباشير تحت سماء مليئة بالنجوم، تجربة تخييم لا تُنسى',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800',
    rating: 4.9,
    duration: '٢-٣ أيام',
    type: 'طبيعي',
    location: 'الفرافرة',
  },
  {
    id: 3,
    title: 'عين السبيل',
    description:
      'عين مياه ساخنة طبيعية للاسترخاء والعلاج الطبيعي، مياه كبريتية ذات فوائد صحية متعددة',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    rating: 4.6,
    duration: 'نصف يوم',
    type: 'استشفائي',
    location: 'الخارجة',
  },
  {
    id: 4,
    title: 'معبد الغويطة',
    description:
      'معبد بطلمي يعود للقرن السادس قبل الميلاد، يضم نقوشاً فريدة تحكي قصص الآلهة المصرية',
    image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=800',
    rating: 4.5,
    duration: '٣ ساعات',
    type: 'أثري',
    location: 'الخارجة',
  },
  {
    id: 5,
    title: 'الصحراء السوداء',
    description: 'تلال بركانية سوداء مذهلة تشكّلت منذ ملايين السنين، منظر فريد في قلب الصحراء',
    image: 'https://images.unsplash.com/photo-1682686581030-7fa4ea2b96c3?w=800',
    rating: 4.7,
    duration: 'يوم كامل',
    type: 'طبيعي',
    location: 'الباويطي',
  },
  {
    id: 6,
    title: 'مقابر البجوات',
    description:
      'أكبر مقبرة مسيحية في العالم تعود للقرن الرابع الميلادي، تضم 263 قبة مزينة برسوم قبطية',
    image: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=800',
    rating: 4.8,
    duration: '٣ ساعات',
    type: 'أثري',
    location: 'الخارجة',
  },
  {
    id: 7,
    title: 'بحيرة الكريستال',
    description: 'بحيرة صافية وسط الصحراء بمياه زرقاء كريستالية، مكان مثالي للسباحة والاسترخاء',
    image: 'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800',
    rating: 4.6,
    duration: 'نصف يوم',
    type: 'طبيعي',
    location: 'سيوة',
  },
  {
    id: 8,
    title: 'عين كليوباترا',
    description: 'عين مياه طبيعية تاريخية يُقال أن الملكة كليوباترا استحمت فيها',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    rating: 4.4,
    duration: 'ساعتين',
    type: 'استشفائي',
    location: 'سيوة',
  },
];

const types = ['الكل', 'أثري', 'طبيعي', 'استشفائي'];

const AttractionsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('الكل');

  const filteredAttractions = allAttractions.filter((attraction) => {
    const matchesSearch =
      attraction.title.includes(searchQuery) ||
      attraction.description.includes(searchQuery) ||
      attraction.location.includes(searchQuery);
    const matchesType = selectedType === 'الكل' || attraction.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container relative px-4">
          <Button variant="ghost" onClick={() => void navigate('/tourism')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للسياحة
          </Button>

          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              المعالم السياحية
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              استكشف أجمل المعالم الأثرية والطبيعية في الوادي الجديد والواحات المصرية
            </p>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن معلم سياحي..."
                  className="pr-12 h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {types.map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Attractions Grid */}
      <section className="py-12">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">عرض {filteredAttractions.length} معلم سياحي</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAttractions.map((attraction) => (
              <Card
                key={attraction.id}
                className="group overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => void navigate(`/tourism/attraction/${attraction.id}`)}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={attraction.image}
                    alt={attraction.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <Badge className="absolute top-4 right-4 bg-card/90 text-foreground backdrop-blur-sm">
                    {attraction.type}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {attraction.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {attraction.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {attraction.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {attraction.duration}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1 text-accent-foreground">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{attraction.rating}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      عرض التفاصيل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAttractions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">لم يتم العثور على نتائج مطابقة لبحثك</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('الكل');
                }}
              >
                إعادة تعيين البحث
              </Button>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AttractionsPage;
