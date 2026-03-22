import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, MapPin, Star, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition } from '@/components/motion/PageTransition';
import { CardSkeleton } from '@/components/motion/Skeleton';
import { PageHero } from '@/components/layout/PageHero';
import heroTourism from '@/assets/hero-tourism.jpg';
import { useAttractions } from '@/hooks/use-attractions';
import { useGuides } from '@/hooks/use-guides';
import {
  attractionTypeLabels,
  piastresToEgp,
  formatRating,
  languageLabels,
  specialtyLabels,
} from '@/lib/format';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';

const TourismPage = () => {
  const navigate = useNavigate();

  const { data: attractionsData, isLoading: loadingAttractions } = useAttractions({
    featured: true,
    limit: 6,
  });
  const { data: guidesData, isLoading: loadingGuides } = useGuides({ limit: 6 });

  const attractions = attractionsData?.pages.flatMap((p) => p.data) ?? [];
  const guides = guidesData?.pages.flatMap((p) => p.data) ?? [];
  const loading = loadingAttractions || loadingGuides;

  return (
    <Layout>
      <PageTransition>
        {/* Hero Section */}
        <PageHero image={heroTourism} alt="السياحة في الوادي الجديد">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <MapPin className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">السياحة والمجتمع</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              السياحة والمجتمع
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              اكتشف المعالم السياحية، احجز مرشداً، أو تصفح باقات السياحة
            </p>
          </SR>
          <SR delay={300}>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="ابحث عن معالم أو مرشدين..."
                className="pr-14 h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
              />
            </div>
          </SR>
        </PageHero>

        {/* Content */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="attractions" className="w-full">
              <SR>
                <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2 mb-10 h-12 rounded-xl">
                  <TabsTrigger value="attractions" className="rounded-lg text-sm font-semibold">
                    المعالم
                  </TabsTrigger>
                  <TabsTrigger value="guides" className="rounded-lg text-sm font-semibold">
                    المرشدين
                  </TabsTrigger>
                </TabsList>
              </SR>

              {/* Attractions Tab */}
              <TabsContent value="attractions" className="space-y-8">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Featured */}
                    <SR>
                      <h3 className="text-2xl font-bold text-foreground mb-6">وجهات مميزة</h3>
                    </SR>
                    <SR stagger>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                        {attractions.map((attraction) => (
                          <Card
                            key={attraction.id}
                            className="group overflow-hidden border-border/50 hover:border-primary/40 hover-lift rounded-2xl"
                          >
                            <div className="aspect-video overflow-hidden relative">
                              <img
                                src={attraction.thumbnail ?? '/placeholder.jpg'}
                                alt={attraction.nameAr}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                              <Badge className="absolute top-4 right-4 glass text-foreground font-medium">
                                {attractionTypeLabels[attraction.type]}
                              </Badge>
                              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <CardContent className="p-6">
                              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-250">
                                {attraction.nameAr}
                              </h3>
                              <p className="text-muted-foreground mb-4 line-clamp-2">
                                {attraction.descriptionAr}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1.5 text-accent">
                                    <Star className="h-5 w-5 fill-current" />
                                    <span className="font-bold text-base">
                                      {formatRating(attraction.ratingAvg)}
                                    </span>
                                  </div>
                                  {attraction.durationHours && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Clock className="h-4 w-4" />
                                      {attraction.durationHours} ساعة
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:scale-[1.03] transition-transform"
                                  onClick={() =>
                                    void navigate(`/tourism/attraction/${attraction.slug}`)
                                  }
                                >
                                  المزيد <ArrowLeft className="h-4 w-4 mr-1" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </SR>

                    {/* All Attractions */}
                    <SR>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-foreground">كل المعالم</h3>
                        <Button
                          variant="outline"
                          className="hover:scale-[1.03] transition-transform"
                          onClick={() => void navigate('/tourism/attractions')}
                        >
                          عرض المزيد
                        </Button>
                      </div>
                    </SR>
                    <SR stagger>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {attractions.map((attraction) => (
                          <Card
                            key={attraction.id}
                            className="group overflow-hidden border-border/50 hover:border-primary/40 hover-lift rounded-2xl cursor-pointer"
                            onClick={() => void navigate(`/tourism/attraction/${attraction.slug}`)}
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={attraction.thumbnail ?? '/placeholder.jpg'}
                                alt={attraction.nameAr}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            </div>
                            <CardContent className="p-5">
                              <h4 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                {attraction.nameAr}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {attractionTypeLabels[attraction.type]}
                                </Badge>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-accent fill-current" />
                                  {formatRating(attraction.ratingAvg)}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </SR>
                  </>
                )}
              </TabsContent>

              {/* Guides Tab */}
              <TabsContent value="guides" className="space-y-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                      {guides.map((guide) => (
                        <Card
                          key={guide.id}
                          className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl"
                        >
                          <CardContent className="p-7">
                            <div className="flex items-center gap-4 mb-5">
                              <img
                                src={guide.profileImage ?? '/placeholder.jpg'}
                                alt={guide.bioAr?.slice(0, 30) ?? 'مرشد'}
                                className="h-18 w-18 rounded-2xl object-cover shadow-md"
                                style={{ width: 72, height: 72 }}
                              />
                              <div>
                                <h3 className="text-lg font-bold text-foreground line-clamp-1">
                                  {guide.bioAr?.slice(0, 50) ?? ''}
                                </h3>
                                <div className="flex items-center gap-1.5 text-accent">
                                  <Star className="h-5 w-5 fill-current" />
                                  <span className="font-bold">{formatRating(guide.ratingAvg)}</span>
                                  <span className="text-sm text-muted-foreground">
                                    ({guide.ratingCount} تقييم)
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3 mb-5">
                              <div>
                                <span className="text-sm text-muted-foreground">اللغات:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {guide.languages.map((lang) => (
                                    <Badge key={lang} variant="secondary" className="text-xs">
                                      {languageLabels[lang as GuideLanguage] ?? lang}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">التخصصات:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {guide.specialties.map((spec) => (
                                    <Badge key={spec} variant="outline" className="text-xs">
                                      {specialtyLabels[spec as GuideSpecialty] ?? spec}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-5 border-t border-border">
                              <div>
                                <span className="text-2xl font-bold text-primary">
                                  {piastresToEgp(guide.basePrice)}
                                </span>
                                <span className="text-sm text-muted-foreground mr-1">/يوم</span>
                              </div>
                              <Button
                                className="hover:scale-[1.03] transition-transform"
                                onClick={() => void navigate(`/guides/${guide.id}`)}
                              >
                                <Calendar className="h-4 w-4 ml-2" />
                                عرض الملف
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SR>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default TourismPage;
