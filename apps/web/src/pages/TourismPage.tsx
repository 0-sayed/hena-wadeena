import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Clock, MapPin, Search, Star } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
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
import { useAuth } from '@/hooks/use-auth';
import { useAttractions } from '@/hooks/use-attractions';
import { useGuides } from '@/hooks/use-guides';
import { usePublicUsers } from '@/hooks/use-users';
import { pickLocalizedCopy, pickLocalizedField } from '@/lib/localization';
import {
  areaLabels,
  attractionTypeLabel,
  attractionTypeLabels,
  formatRating,
  languageLabel,
  languageLabels,
  piastresToEgp,
  specialtyLabel,
  specialtyLabels,
} from '@/lib/format';
import { matchesSearchQuery } from '@/lib/search';
import type { AppLanguage } from '@/lib/localization';
import type { PublicUserProfile } from '@/services/api';

function getGuideName(language: AppLanguage, profile?: PublicUserProfile) {
  return (
    profile?.display_name ??
    profile?.full_name ??
    pickLocalizedCopy(language, {
      ar: 'مرشد سياحي',
      en: 'Tour guide',
    })
  );
}

const TourismPage = () => {
  const navigate = useNavigate();
  const { language } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: featuredAttractions, isLoading: loadingFeatured } = useAttractions(
    { featured: true },
    6,
  );
  const { data: allAttractions, isLoading: loadingAll } = useAttractions(undefined, 8);
  const { data: guides, isLoading: loadingGuides } = useGuides(undefined, 6);
  const { data: publicUsersData } = usePublicUsers(guides.map((guide) => guide.userId));
  const publicUsers = useMemo(() => publicUsersData ?? {}, [publicUsersData]);
  const loading = loadingFeatured || loadingAll || loadingGuides;

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchQuery((previous) => previous.trim());
  };

  const filteredFeaturedAttractions = useMemo(
    () =>
      featuredAttractions.filter((attraction) =>
        matchesSearchQuery(searchQuery, [
          attraction.nameAr,
          attraction.nameEn,
          attraction.descriptionAr,
          attraction.descriptionEn,
          attraction.historyAr,
          attraction.type,
          attractionTypeLabels[attraction.type],
          attraction.area,
          areaLabels[attraction.area],
          ...(attraction.tips ?? []),
        ]),
      ),
    [featuredAttractions, searchQuery],
  );

  const filteredAllAttractions = useMemo(
    () =>
      allAttractions.filter((attraction) =>
        matchesSearchQuery(searchQuery, [
          attraction.nameAr,
          attraction.nameEn,
          attraction.descriptionAr,
          attraction.descriptionEn,
          attraction.historyAr,
          attraction.type,
          attractionTypeLabels[attraction.type],
          attraction.area,
          areaLabels[attraction.area],
          ...(attraction.tips ?? []),
        ]),
      ),
    [allAttractions, searchQuery],
  );

  const filteredGuides = useMemo(
    () =>
      guides.filter((guide) => {
        const profile = publicUsers[guide.userId];

        return matchesSearchQuery(searchQuery, [
          profile?.display_name,
          profile?.full_name,
          guide.bioAr,
          guide.bioEn,
          ...guide.specialties,
          ...guide.specialties.map((specialty) => specialtyLabels[specialty] ?? specialty),
          ...guide.languages,
          ...guide.languages.map((lang) => languageLabels[lang] ?? lang),
          ...(guide.areasOfOperation ?? []),
          ...(guide.areasOfOperation ?? []).map(
            (area) => areaLabels[area as keyof typeof areaLabels] ?? area,
          ),
        ]);
      }),
    [guides, publicUsers, searchQuery],
  );

  return (
    <Layout title={pickLocalizedCopy(language, { ar: 'السياحة', en: 'Tourism' })}>
      <PageTransition>
        <PageHero
          image={heroTourism}
          alt={pickLocalizedCopy(language, {
            ar: 'السياحة في الوادي الجديد',
            en: 'Tourism in New Valley',
          })}
        >
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <MapPin className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">
                {pickLocalizedCopy(language, {
                  ar: 'السياحة والمجتمع',
                  en: 'Tourism & community',
                })}
              </span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              {pickLocalizedCopy(language, {
                ar: 'السياحة والمجتمع',
                en: 'Tourism & community',
              })}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-10 text-lg text-card/90 md:text-xl">
              {pickLocalizedCopy(language, {
                ar: 'اكتشف المعالم السياحية، احجز مرشداً، أو تصفح باقات السياحة',
                en: 'Discover attractions, book a guide, or browse tourism experiences',
              })}
            </p>
          </SR>
          <SR delay={300}>
            <form onSubmit={handleSearch} className="mx-auto max-w-xl">
              <div className="relative flex flex-col gap-3 sm:block">
                <Search className="search-inline-icon-lg absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground sm:h-6 sm:w-6" />
                <Input
                  placeholder={pickLocalizedCopy(language, {
                    ar: 'ابحث عن معالم أو مرشدين...',
                    en: 'Search for attractions or guides...',
                  })}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="search-input-with-icon-lg h-14 rounded-2xl border-0 bg-card/90 ps-14 pe-4 text-base shadow-lg backdrop-blur-sm sm:h-16 sm:ps-28 sm:text-lg"
                />
                <Button
                  type="submit"
                  className="w-full rounded-xl sm:absolute sm:start-2 sm:top-1/2 sm:w-auto sm:-translate-y-1/2"
                >
                  {pickLocalizedCopy(language, { ar: 'ابحث', en: 'Search' })}
                </Button>
              </div>
            </form>
          </SR>
        </PageHero>

        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="attractions" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-sm grid-cols-2 rounded-2xl p-1 sm:mb-10 sm:h-12 sm:max-w-xs sm:rounded-xl">
                  <TabsTrigger
                    value="attractions"
                    className="min-h-[44px] rounded-xl text-sm font-semibold"
                  >
                    {pickLocalizedCopy(language, { ar: 'المعالم', en: 'Attractions' })}
                  </TabsTrigger>
                  <TabsTrigger
                    value="guides"
                    className="min-h-[44px] rounded-xl text-sm font-semibold"
                  >
                    {pickLocalizedCopy(language, { ar: 'المرشدين', en: 'Guides' })}
                  </TabsTrigger>
                </TabsList>
              </SR>

              <TabsContent value="attractions" className="space-y-8">
                {loading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                      <CardSkeleton key={item} />
                    ))}
                  </div>
                ) : (
                  <>
                    <SR>
                      <h3 className="mb-6 text-2xl font-bold text-foreground">
                        {pickLocalizedCopy(language, {
                          ar: 'وجهات مميزة',
                          en: 'Featured destinations',
                        })}
                      </h3>
                    </SR>
                    <SR stagger>
                      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                        {filteredFeaturedAttractions.map((attraction) => (
                          <Card
                            key={attraction.id}
                            className="group overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                          >
                            <div className="relative aspect-video overflow-hidden">
                              <img
                                src={attraction.thumbnail ?? '/placeholder.jpg'}
                                alt={pickLocalizedField(language, {
                                  ar: attraction.nameAr,
                                  en: attraction.nameEn,
                                })}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <Badge className="absolute end-4 top-4 glass font-medium text-foreground">
                                {attractionTypeLabel(attraction.type, language)}
                              </Badge>
                              <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            </div>
                            <CardContent className="p-6">
                              <h3 className="mb-2 text-xl font-bold text-foreground transition-colors duration-250 group-hover:text-primary">
                                {pickLocalizedField(language, {
                                  ar: attraction.nameAr,
                                  en: attraction.nameEn,
                                })}
                              </h3>
                              <p className="mb-4 line-clamp-2 text-muted-foreground">
                                {pickLocalizedField(language, {
                                  ar: attraction.descriptionAr,
                                  en: attraction.descriptionEn,
                                })}
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
                                      {attraction.durationHours}{' '}
                                      {pickLocalizedCopy(language, {
                                        ar: 'ساعة',
                                        en: 'hours',
                                      })}
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
                                  {pickLocalizedCopy(language, {
                                    ar: 'المزيد',
                                    en: 'View details',
                                  })}{' '}
                                  <ArrowLeft className="me-1 h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </SR>

                    <SR>
                      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-2xl font-bold text-foreground">
                          {pickLocalizedCopy(language, {
                            ar: 'كل المعالم',
                            en: 'All attractions',
                          })}
                        </h3>
                        <Button
                          variant="outline"
                          className="w-full transition-transform hover:scale-[1.03] sm:w-auto"
                          onClick={() => void navigate('/tourism/attractions')}
                        >
                          {pickLocalizedCopy(language, {
                            ar: 'عرض المزيد',
                            en: 'View more',
                          })}
                        </Button>
                      </div>
                    </SR>
                    <SR stagger>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {filteredAllAttractions.map((attraction) => (
                          <Card
                            key={attraction.id}
                            className="group cursor-pointer overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                            onClick={() => void navigate(`/tourism/attraction/${attraction.slug}`)}
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={attraction.thumbnail ?? '/placeholder.jpg'}
                                alt={pickLocalizedField(language, {
                                  ar: attraction.nameAr,
                                  en: attraction.nameEn,
                                })}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            </div>
                            <CardContent className="p-5">
                              <h4 className="mb-2 font-bold text-foreground transition-colors group-hover:text-primary">
                                {pickLocalizedField(language, {
                                  ar: attraction.nameAr,
                                  en: attraction.nameEn,
                                })}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {attractionTypeLabel(attraction.type, language)}
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
                    {[1, 2, 3].map((item) => (
                      <CardSkeleton key={item} />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                      {filteredGuides.map((guide) => {
                        const guideName = getGuideName(language, publicUsers[guide.userId]);

                        return (
                          <Card
                            key={guide.id}
                            className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                          >
                            <CardContent className="p-7">
                              <div className="mb-5 flex items-start gap-4">
                                <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl shadow-md">
                                  <img
                                    src={guide.profileImage ?? '/placeholder.jpg'}
                                    alt={guideName}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="line-clamp-1 text-lg font-bold text-foreground">
                                    {guideName}
                                  </h3>
                                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                    {pickLocalizedField(language, {
                                      ar: guide.bioAr,
                                      en: guide.bioEn,
                                    }) ||
                                      pickLocalizedCopy(language, {
                                        ar: 'مرشد معتمد لرحلات الوادي الجديد',
                                        en: 'Licensed guide for New Valley trips.',
                                      })}
                                  </p>
                                  <div className="mt-2 flex items-center gap-1.5 text-accent">
                                    <Star className="h-5 w-5 fill-current" />
                                    <span className="font-bold">
                                      {formatRating(guide.ratingAvg)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      ({guide.ratingCount}{' '}
                                      {pickLocalizedCopy(language, {
                                        ar: 'تقييم',
                                        en: 'reviews',
                                      })}
                                      )
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-5 space-y-3">
                                <div>
                                  <span className="text-sm text-muted-foreground">
                                    {pickLocalizedCopy(language, {
                                      ar: 'اللغات:',
                                      en: 'Languages:',
                                    })}
                                  </span>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {guide.languages.map((guideLanguage) => (
                                      <Badge
                                        key={guideLanguage}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {languageLabel(guideLanguage, language)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">
                                    {pickLocalizedCopy(language, {
                                      ar: 'التخصصات:',
                                      en: 'Specialties:',
                                    })}
                                  </span>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {guide.specialties.map((specialty) => (
                                      <Badge key={specialty} variant="outline" className="text-xs">
                                        {specialtyLabel(specialty, language)}
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
                                  <span className="me-1 text-sm text-muted-foreground">
                                    {pickLocalizedCopy(language, { ar: '/يوم', en: '/day' })}
                                  </span>
                                </div>
                                <Button
                                  className="transition-transform hover:scale-[1.03]"
                                  onClick={() => void navigate(`/guides/${guide.id}`)}
                                >
                                  <Calendar className="ms-2 h-4 w-4" />
                                  {pickLocalizedCopy(language, {
                                    ar: 'عرض الملف',
                                    en: 'View profile',
                                  })}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
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
