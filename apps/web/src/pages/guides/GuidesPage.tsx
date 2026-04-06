import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Search, Star, Users } from 'lucide-react';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition } from '@/components/motion/PageTransition';
import { CardSkeleton } from '@/components/motion/Skeleton';
import { PageHero } from '@/components/layout/PageHero';
import heroGuides from '@/assets/hero-guides.jpg';
import { useGuides } from '@/hooks/use-guides';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { usePublicUsers } from '@/hooks/use-users';
import {
  areaLabels,
  formatRating,
  languageLabels,
  piastresToEgp,
  specialtyLabels,
} from '@/lib/format';
import { matchesSearchQuery } from '@/lib/search';
import type { GuideFilters, PublicUserProfile } from '@/services/api';

function getGuideName(profile?: PublicUserProfile) {
  return profile?.display_name ?? profile?.full_name ?? 'مرشد سياحي';
}

const GuidesPage = () => {
  const [filters, setFilters] = useState<Omit<GuideFilters, 'page' | 'limit'>>({});
  const [searchInput, setSearchInput] = useState('');

  const {
    data: guides,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGuides(filters, 12);

  const { data: publicUsersData } = usePublicUsers(guides.map((guide) => guide.userId));
  const publicUsers = useMemo(() => publicUsersData ?? {}, [publicUsersData]);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setFilters((previous) => ({ ...previous, search: value || undefined }));
  });

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setSearchInput(nextValue);
    debouncedSetSearch(nextValue);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    setSearchInput(trimmed);
    debouncedSetSearch(trimmed); // cancel any pending debounce with stale untrimmed value
    setFilters((previous) => ({ ...previous, search: trimmed || undefined }));
  };

  const filteredGuides = useMemo(
    () =>
      guides.filter((guide) => {
        const profile = publicUsers[guide.userId];

        return matchesSearchQuery(searchInput, [
          getGuideName(profile),
          guide.bioAr,
          guide.bioEn,
          ...guide.specialties,
          ...guide.specialties.map((specialty) => specialtyLabels[specialty] ?? specialty),
          ...guide.languages,
          ...guide.languages.map((language) => languageLabels[language] ?? language),
          ...guide.areasOfOperation,
          ...guide.areasOfOperation.map(
            (area) => areaLabels[area as keyof typeof areaLabels] ?? area,
          ),
        ]);
      }),
    [guides, publicUsers, searchInput],
  );

  const handleLanguageChange = (value: string) => {
    setFilters((previous) => ({ ...previous, language: value === 'all' ? undefined : value }));
  };

  const handleSpecialtyChange = (value: string) => {
    setFilters((previous) => ({ ...previous, specialty: value === 'all' ? undefined : value }));
  };

  const handleAreaChange = (value: string) => {
    setFilters((previous) => ({ ...previous, area: value === 'all' ? undefined : value }));
  };

  return (
    <Layout title="المرشدون السياحيون">
      <PageTransition>
        <PageHero image={heroGuides} alt="المرشدين السياحيين">
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">المرشدين السياحيين</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              المرشدين السياحيين
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-10 text-lg text-card/90 md:text-xl">
              اختر مرشدك واحجز رحلة مميزة في الوادي الجديد
            </p>
          </SR>
          <SR delay={300}>
            <form onSubmit={handleSearch} className="relative mx-auto max-w-xl">
              <Search className="search-inline-icon-lg absolute top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث بالتخصص أو الوصف..."
                value={searchInput}
                onChange={handleSearchChange}
                className="search-input-with-icon-lg h-16 rounded-2xl border-0 bg-card/90 text-lg shadow-lg backdrop-blur-sm ps-28"
              />
              <Button
                type="submit"
                className="absolute start-2 top-1/2 -translate-y-1/2 rounded-xl"
              >
                ابحث
              </Button>
            </form>
          </SR>
        </PageHero>

        <section className="border-b border-border/50 py-6">
          <div className="container flex flex-wrap gap-3 px-4">
            <Select onValueChange={handleLanguageChange} defaultValue="all">
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder="اللغة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل اللغات</SelectItem>
                {(Object.values(GuideLanguage) as GuideLanguage[]).map((language) => (
                  <SelectItem key={language} value={language}>
                    {languageLabels[language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleSpecialtyChange} defaultValue="all">
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder="التخصص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التخصصات</SelectItem>
                {(Object.values(GuideSpecialty) as GuideSpecialty[]).map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialtyLabels[specialty]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleAreaChange} defaultValue="all">
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder="المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المناطق</SelectItem>
                {Object.entries(areaLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="py-14">
          <div className="container px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <CardSkeleton key={item} />
                ))}
              </div>
            ) : isError ? (
              <div className="space-y-4 py-12 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
                <p className="text-lg text-muted-foreground">حدث خطأ أثناء تحميل المرشدين</p>
                <Button variant="outline" onClick={() => void refetch()}>
                  إعادة المحاولة
                </Button>
              </div>
            ) : (
              <>
                <SR stagger>
                  <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                    {filteredGuides.map((guide) => {
                      const guideName = getGuideName(publicUsers[guide.userId]);

                      return (
                        <Link
                          key={guide.id}
                          to={`/guides/${guide.id}`}
                          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Card className="group h-full cursor-pointer overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift">
                            <CardContent className="p-0">
                              <div className="relative h-52 overflow-hidden">
                                <img
                                  src={guide.profileImage ?? '/placeholder.jpg'}
                                  alt={guideName}
                                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                {guide.licenseVerified && (
                                  <Badge className="absolute start-3 top-3 bg-green-500 text-white shadow-lg">
                                    ✓ مرخّص
                                  </Badge>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                              </div>

                              <div className="space-y-3 p-6">
                                <div className="space-y-1">
                                  <h2 className="text-xl font-bold text-foreground">{guideName}</h2>
                                  <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {guide.bioAr ??
                                      guide.bioEn ??
                                      'مرشد معتمد لرحلات الوادي الجديد'}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {guide.specialties.map((specialty) => (
                                    <Badge key={specialty} variant="outline" className="text-xs">
                                      {specialtyLabels[specialty as GuideSpecialty] ?? specialty}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {guide.languages.map((language) => (
                                    <Badge key={language} variant="secondary" className="text-xs">
                                      {languageLabels[language as GuideLanguage] ?? language}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between border-t pt-4">
                                  <div className="flex items-center gap-1.5">
                                    <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                                    <span className="font-bold text-base">
                                      {formatRating(guide.ratingAvg)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      ({guide.ratingCount})
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-xl font-bold text-primary">
                                      {piastresToEgp(guide.basePrice)}
                                    </span>
                                    <span className="ms-1 text-sm text-muted-foreground">/يوم</span>
                                  </div>
                                </div>

                                {guide.packageCount > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {guide.packageCount} باقة متاحة
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </SR>

                {guides.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-lg text-muted-foreground">لا يوجد مرشدون متاحون</p>
                  </div>
                )}
                {guides.length > 0 && filteredGuides.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-lg text-muted-foreground">لا يوجد مرشدون مطابقون للبحث</p>
                  </div>
                )}

                <LoadMoreButton
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                />
              </>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default GuidesPage;
