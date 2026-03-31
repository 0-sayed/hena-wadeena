import { type FormEvent, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const { data: featuredAttractions, isLoading: loadingFeatured } = useAttractions(
    { featured: true },
    6,
  );
  const { data: allAttractions, isLoading: loadingAll } = useAttractions(undefined, 8);
  const { data: guides, isLoading: loadingGuides } = useGuides(undefined, 6);
  const loading = loadingFeatured || loadingAll || loadingGuides;

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    void navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Layout>
      <PageTransition>
        <PageHero image={heroTourism} alt="السياحة في الوادي الجديد">
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <MapPin className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">السياحة والمجتمع</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              السياحة والمجتمع
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-10 text-lg text-card/90 md:text-xl">
              اكتشف المعالم السياحية، احجز مرشداً، أو تصفح باقات السياحة
            </p>
          </SR>
          <SR delay={300}>
            <form onSubmit={handleSearch} className="relative mx-auto max-w-xl">
              <Search className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن معالم أو مرشدين..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-16 rounded-2xl border-0 bg-card/90 pr-14 pl-28 text-lg shadow-lg backdrop-blur-sm"
              />
              <Button
                type="submit"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl"
              >
                ابحث
              </Button>
            </form>
          </SR>
        </PageHero>

        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="attractions" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-10 grid h-12 w-full max-w-xs grid-cols-2 rounded-xl">
                  <TabsTrigger value="attractions" className="rounded-lg text-sm font-semibold">
                    المعالم
                  </TabsTrigger>
                  <TabsTrigger value="guides" className="rounded-lg text-sm font-semibold">
                    المرشدين
                  </TabsTrigger>
                </TabsList>
              </SR>

              <TabsContent value="attractions" className="space-y-8">
                {loading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <>
                    <SR>
                      <h3 className="mb-6 text-2xl font-bold text-foreground">وجهات مميزة</h3>
                    </SR>
                    <SR stagger>
                      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                        {featuredAttractions.map((attraction) => (
                          <Card
                            key={attraction.id}
                            className="group overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                          >
                            <div className="relative aspect-video overflow-hidden">
                              <img
                                src={attraction.thumbnail ?? '/placeholder.jpg'}
                                alt={attraction.nameAr}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <Badge className="absolute top-4 right-4 glass font-medium text-foreground">
                                {attractionTypeLabels[attraction.type]}
                              </Badge>
                              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </div>
                            <CardContent className="p-6">
                              <h3 className="mb-2 text-xl font-bold text-foreground transition-colors duration-250 group-hover:text-primary">
                                {attraction.nameAr}
                              </h3>
                              <p className="mb-4 line-clamp-2 text-muted-foreground">
                                {attraction.descriptionAr}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1.5 text-accent">
                                    <Star className="h-5 w-5 fill-current" />
                                    <span className="text-base font-bold">
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
                                  className="transition-transform hover:scale-[1.03]"
                                  onClick={() =>
                                    void navigate(`/tourism/attraction/${attraction.slug}`)
                                  }
                                >
                                  المزيد <ArrowLeft className="mr-1 h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </SR>

                    <SR>
                      <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-foreground">كل المعالم</h3>
                        <Button
                          variant="outline"
                          className="transition-transform hover:scale-[1.03]"
                          onClick={() => void navigate('/tourism/attractions')}
                        >
                          عرض المزيد
                        </Button>
                      </div>
                    </SR>
                    <SR stagger>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {allAttractions.map((attraction) => (
                          <Card
                            key={attraction.id}
                            className="group cursor-pointer overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                            onClick={() => void navigate(`/tourism/attraction/${attraction.slug}`)}
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={attraction.thumbnail ?? '/placeholder.jpg'}
                                alt={attraction.nameAr}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            </div>
                            <CardContent className="p-5">
                              <h4 className="mb-2 font-bold text-foreground transition-colors group-hover:text-primary">
                                {attraction.nameAr}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {attractionTypeLabels[attraction.type]}
                                </Badge>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-current text-accent" />
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

              <TabsContent value="guides" className="space-y-6">
                {loading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <CardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                      {guides.map((guide) => (
                        <Card
                          key={guide.id}
                          className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                        >
                          <CardContent className="p-7">
                            <div className="mb-5 flex items-center gap-4">
                              <img
                                src={guide.profileImage ?? '/placeholder.jpg'}
                                alt={guide.bioAr?.slice(0, 30) ?? 'مرشد'}
                                className="h-18 w-18 rounded-2xl object-cover shadow-md"
                                style={{ width: 72, height: 72 }}
                              />
                              <div>
                                <h3 className="line-clamp-1 text-lg font-bold text-foreground">
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
                            <div className="mb-5 space-y-3">
                              <div>
                                <span className="text-sm text-muted-foreground">اللغات:</span>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {guide.languages.map((lang) => (
                                    <Badge key={lang} variant="secondary" className="text-xs">
                                      {languageLabels[lang as GuideLanguage] ?? lang}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">التخصصات:</span>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {guide.specialties.map((spec) => (
                                    <Badge key={spec} variant="outline" className="text-xs">
                                      {specialtyLabels[spec as GuideSpecialty] ?? spec}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-5">
                              <div>
                                <span className="text-2xl font-bold text-primary">
                                  {piastresToEgp(guide.basePrice)}
                                </span>
                                <span className="mr-1 text-sm text-muted-foreground">/يوم</span>
                              </div>
                              <Button
                                className="transition-transform hover:scale-[1.03]"
                                onClick={() => void navigate(`/guides/${guide.id}`)}
                              >
                                <Calendar className="ml-2 h-4 w-4" />
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
