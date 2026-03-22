import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, Star, Users } from 'lucide-react';
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
import {
  languageLabels,
  specialtyLabels,
  areaLabels,
  piastresToEgp,
  formatRating,
} from '@/lib/format';
import type { GuideFilters } from '@/services/api';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';

const GuidesPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Omit<GuideFilters, 'page'>>({ limit: 12 });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useGuides(filters);

  const guides = data?.pages.flatMap((p) => p.data) ?? [];

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearch(e.target.value);
  };

  const handleLanguageChange = (value: string) => {
    setFilters((prev) => ({ ...prev, language: value === 'all' ? undefined : value }));
  };

  const handleSpecialtyChange = (value: string) => {
    setFilters((prev) => ({ ...prev, specialty: value === 'all' ? undefined : value }));
  };

  const handleAreaChange = (value: string) => {
    setFilters((prev) => ({ ...prev, area: value === 'all' ? undefined : value }));
  };

  return (
    <Layout>
      <PageTransition>
        {/* Hero */}
        <PageHero image={heroGuides} alt="المرشدين السياحيين">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">المرشدين السياحيين</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 text-card">
              المرشدين السياحيين
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              اختر مرشدك واحجز رحلة مميزة في الوادي الجديد
            </p>
          </SR>
          <SR delay={300}>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="ابحث بالتخصص أو الوصف..."
                onChange={handleSearchChange}
                className="pr-14 h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
              />
            </div>
          </SR>
        </PageHero>

        {/* Filters */}
        <section className="py-6 border-b border-border/50">
          <div className="container px-4 flex flex-wrap gap-3">
            <Select onValueChange={handleLanguageChange} defaultValue="all">
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder="اللغة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل اللغات</SelectItem>
                {(Object.values(GuideLanguage) as GuideLanguage[]).map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {languageLabels[lang]}
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
                {(Object.values(GuideSpecialty) as GuideSpecialty[]).map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {specialtyLabels[spec]}
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

        {/* Cards */}
        <section className="py-14">
          <div className="container px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                <SR stagger>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                    {guides.map((guide) => (
                      <Card
                        key={guide.id}
                        className="hover-lift cursor-pointer group overflow-hidden rounded-2xl border-border/50 hover:border-primary/40"
                        onClick={() => void navigate(`/guides/${guide.id}`)}
                      >
                        <CardContent className="p-0">
                          <div className="relative overflow-hidden">
                            <img
                              src={guide.profileImage ?? '/placeholder.jpg'}
                              alt={guide.bioAr?.slice(0, 30) ?? 'مرشد'}
                              className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            {guide.licenseVerified && (
                              <Badge className="absolute top-3 left-3 bg-green-500 text-white shadow-lg">
                                ✓ مرخّص
                              </Badge>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          <div className="p-6 space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {guide.bioAr}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {guide.specialties.map((s) => (
                                <Badge key={s} variant="outline" className="text-xs">
                                  {specialtyLabels[s as GuideSpecialty] ?? s}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {guide.languages.map((l) => (
                                <Badge key={l} variant="secondary" className="text-xs">
                                  {languageLabels[l as GuideLanguage] ?? l}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t">
                              <div className="flex items-center gap-1.5">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
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
                                <span className="text-sm text-muted-foreground mr-1">/يوم</span>
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
                    ))}
                  </div>
                </SR>

                {guides.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">لا يوجد مرشدون متاحون</p>
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
