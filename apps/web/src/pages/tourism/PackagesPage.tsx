import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router';
import { AlertCircle, Search, Star, Clock, Users } from 'lucide-react';
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
import heroTourism from '@/assets/hero-tourism.jpg';
import { usePackages } from '@/hooks/use-packages';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { areaLabel, areaLabels, piastresToEgp, formatRating } from '@/lib/format';
import type { PackageFilters } from '@/services/api';
import { useCanBook } from '@/hooks/use-bookings';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import type { AppLanguage } from '@/lib/localization';

const PackagesPage = () => {
  const [filters, setFilters] = useState<Omit<PackageFilters, 'page' | 'limit'>>({});
  const { t } = useTranslation('tourism');
  const { language } = useAuth();
  const appLanguage = language as AppLanguage;
  const canBook = useCanBook();

  const {
    data: packages,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePackages(filters, 12);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearch(e.target.value);
  };

  const handleAreaChange = (value: string) => {
    setFilters((prev) => ({ ...prev, area: value === 'all' ? undefined : value }));
  };

  return (
    <Layout title={t('packages.pageTitle')}>
      <PageTransition>
        <PageHero image={heroTourism} alt={t('packages.packagesLabel')}>
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Clock className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">{t('packages.packagesLabel')}</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              {t('packages.packagesTitle')}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              {t('packages.packagesSubtitle')}
            </p>
          </SR>
          <SR delay={300}>
            <div className="relative max-w-xl mx-auto">
              <Search className="search-inline-icon-lg absolute top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder={t('packages.packagesSearchPlaceholder')}
                onChange={handleSearchChange}
                className="search-input-with-icon-lg h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
              />
            </div>
          </SR>
        </PageHero>

        {/* Filters */}
        <section className="py-6 border-b border-border/50">
          <div className="container px-4 flex flex-wrap gap-3">
            <Select onValueChange={handleAreaChange} defaultValue="all">
              <SelectTrigger className="h-10 w-36">
                <SelectValue placeholder={t('packages.areaLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('packages.allAreas')}</SelectItem>
                {Object.keys(areaLabels).map((value) => (
                  <SelectItem key={value} value={value}>
                    {areaLabel(value, appLanguage)}
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
            ) : isError ? (
              <div className="text-center py-12 space-y-4">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-muted-foreground text-lg">{t('packages.errorLoadingPackages')}</p>
                <Button variant="outline" onClick={() => void refetch()}>
                  {t('packages.retryBtn')}
                </Button>
              </div>
            ) : (
              <>
                <SR stagger>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                    {packages.map((pkg) => (
                      <Card
                        key={pkg.id}
                        className="hover-lift overflow-hidden rounded-2xl border-border/50 hover:border-primary/40"
                      >
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-lg font-bold text-foreground">
                            {(appLanguage === 'en' ? pkg.titleEn : pkg.titleAr) ?? pkg.titleAr ?? ''}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {t('packages.hours', { hours: pkg.durationHours })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {t('packages.maxPeople', { max: pkg.maxPeople })}
                            </span>
                          </div>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {pkg.description}
                            </p>
                          )}

                          {/* Guide info */}
                          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                            <img
                              src={pkg.guideProfileImage ?? '/placeholder.jpg'}
                              alt={t('packages.guideRole')}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">
                                {(appLanguage === 'en' ? pkg.guideBioEn : pkg.guideBioAr) ?? pkg.guideBioAr ?? ''?.slice(0, 40) ?? ''}
                              </p>
                              {(pkg.guideRatingAvg != null || pkg.guideLicenseVerified) && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {pkg.guideRatingAvg != null && (
                                    <>
                                      <Star className="h-3 w-3 text-accent fill-current" />
                                      {formatRating(pkg.guideRatingAvg)}
                                    </>
                                  )}
                                  {pkg.guideLicenseVerified && (
                                    <Badge className="h-4 text-[10px] bg-green-500/10 text-green-600 me-1">
                                      {t('packages.licensedBadge')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Attraction links */}
                          {pkg.attractionSlugs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pkg.attractionSlugs.map((slug) => (
                                <Link
                                  key={slug}
                                  to={`/tourism/attraction/${slug}`}
                                  className="text-xs text-primary underline"
                                >
                                  {slug}
                                </Link>
                              ))}
                            </div>
                          )}

                          {/* Price */}
                          <div className="flex justify-between items-center pt-2 border-t border-border/50">
                            <span className="text-xl font-bold text-primary">
                              {piastresToEgp(pkg.price)}
                              <span className="text-xs font-normal text-muted-foreground me-1">
                                {t('packages.perPerson')}
                              </span>
                            </span>
                            {canBook && (
                              <Link to={`/tourism/book-package/${pkg.id}`}>
                                <Button size="sm">{t('packages.bookNowBtn')}</Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </SR>

                {packages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">{t('packages.noPackagesAvailable')}</p>
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

export default PackagesPage;
