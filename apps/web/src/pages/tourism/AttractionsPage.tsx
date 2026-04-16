import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { AlertCircle, Search, Star, Clock, ArrowRight, MapPin } from 'lucide-react';
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
import { useAttractions } from '@/hooks/use-attractions';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import {
  attractionTypeLabel,
  attractionTypeLabels,
  areaLabel,
  areaLabels,
  formatRating,
  type AttractionType,
  type AttractionArea,
} from '@/lib/format';
import type { AttractionFilters } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import type { AppLanguage } from '@/lib/localization';

const AttractionsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('tourism');
  const { language } = useAuth();
  const appLanguage = language as AppLanguage;
  const [filters, setFilters] = useState<Omit<AttractionFilters, 'page' | 'limit'>>({});

  const {
    data: attractions,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAttractions(filters, 12);

  const handleTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      type: value === 'all' ? undefined : (value as AttractionType),
    }));
  };

  const handleAreaChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      area: value === 'all' ? undefined : (value as AttractionArea),
    }));
  };

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearch(e.target.value);
  };

  return (
    <Layout title={t('attractions.pageTitle')}>
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container relative px-4">
          <Button variant="ghost" onClick={() => void navigate('/tourism')} className="mb-6">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {t('attractions.backToTourism')}
          </Button>

          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('attractions.pageTitle')}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">{t('attractions.heroSubtitle')}</p>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="search-inline-icon-lg absolute top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t('attractions.searchPlaceholder')}
                  className="search-input-with-icon-md h-12"
                  onChange={handleSearchChange}
                />
              </div>
              <Select onValueChange={handleTypeChange} defaultValue="all">
                <SelectTrigger className="h-12 w-40">
                  <SelectValue placeholder={t('attractions.typeLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('attractions.allTypes')}</SelectItem>
                  {(Object.keys(attractionTypeLabels) as AttractionType[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {attractionTypeLabel(value, appLanguage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={handleAreaChange} defaultValue="all">
                <SelectTrigger className="h-12 w-40">
                  <SelectValue placeholder={t('attractions.areaLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('attractions.allAreas')}</SelectItem>
                  {(Object.keys(areaLabels) as AttractionArea[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {areaLabel(value, appLanguage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Attractions Grid */}
      <section className="py-12">
        <div className="container px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-muted-foreground text-lg">{t('attractions.loadError')}</p>
              <Button variant="outline" onClick={() => void refetch()}>
                {t('attractions.retryBtn')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  {t('attractions.displayCount', { count: attractions.length })}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attractions.map((attraction) => (
                  <Card
                    key={attraction.id}
                    className="group overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => void navigate(`/tourism/attraction/${attraction.slug}`)}
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <img
                        src={attraction.thumbnail ?? '/placeholder.jpg'}
                        alt={
                          (appLanguage === 'en' ? attraction.nameEn : attraction.nameAr) ??
                          attraction.nameAr ??
                          ''
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <Badge className="absolute top-4 end-4 bg-card/90 text-foreground backdrop-blur-sm">
                        {attractionTypeLabel(attraction.type, appLanguage)}
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {(appLanguage === 'en' ? attraction.nameEn : attraction.nameAr) ??
                          attraction.nameAr ??
                          ''}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {(appLanguage === 'en'
                          ? attraction.descriptionEn
                          : attraction.descriptionAr) ??
                          attraction.descriptionAr ??
                          ''}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {areaLabel(attraction.area, appLanguage)}
                        </div>
                        {attraction.durationHours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {t('attractions.hours', { hours: attraction.durationHours })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-1 text-accent-foreground">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">{formatRating(attraction.ratingAvg)}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          {t('attractions.viewDetailsBtn')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {attractions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">{t('attractions.noResults')}</p>
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
    </Layout>
  );
};

export default AttractionsPage;
