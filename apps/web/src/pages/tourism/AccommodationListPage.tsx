import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, GraduationCap, Home, MapPin, Search } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHero } from '@/components/layout/PageHero';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/motion/Skeleton';
import { useListings } from '@/hooks/use-listings';
import { districtLabel, DISTRICTS_WITH_ALL, formatPrice } from '@/lib/format';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import type { AppLanguage } from '@/lib/localization';

const AccommodationListPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('accommodation');
  const { language } = useAuth();
  const appLanguage = language as AppLanguage;
  const [district, setDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, refetch } = useListings({
    category: 'accommodation',
    district: district === 'all' ? undefined : district,
    limit: 48,
  });

  const listings = useMemo(() => {
    const items = data?.data ?? [];
    const normalizedSearch = searchQuery.trim();
    if (!normalizedSearch) return items;
    return items.filter((listing) => {
      const haystack = [
        listing.titleAr,
        listing.titleEn ?? '',
        listing.description ?? '',
        listing.address ?? '',
        listing.district ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch.toLowerCase());
    });
  }, [data, searchQuery]);

  return (
    <Layout title={t('list.title')}>
      <PageHero image="/images/seed/AO6BYTEnlMo.jpg" alt={t('list.subtitle')}>
        <div className="mb-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => void navigate('/tourism')}
            className="text-card hover:bg-card/10 hover:text-card"
          >
            <ArrowRight className="h-4 w-4" />
            {t('list.back')}
          </Button>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold text-card mb-4">
          <GraduationCap className="h-4 w-4" />
          {t('list.subtitle')}
        </div>
        <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
          {t('list.heroTitle')}
        </h1>
        <p className="text-lg text-card/90 md:text-xl">
          {t('list.heroDesc')}
        </p>
      </PageHero>

      <section className="py-10">
        <div className="container px-4 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="search-inline-icon-md absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('list.searchPlaceholder')}
                className="search-input-with-icon-md"
              />
            </div>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder={t('list.districtLabel')} />
              </SelectTrigger>
              <SelectContent>
                {DISTRICTS_WITH_ALL.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.id === 'all' ? t('list.allDistricts') : districtLabel(item.id, appLanguage)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} h="h-72" className="rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center space-y-4">
                <p className="text-muted-foreground">{t('list.errorLoading')}</p>
                <Button variant="outline" onClick={() => void refetch()}>
                  {t('list.retry')}
                </Button>
              </CardContent>
            </Card>
          ) : listings.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center space-y-3">
                <Home className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">
                  {t('list.emptyMatch')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={listing.images?.[0] ?? '/placeholder.jpg'}
                      alt={(appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? ''}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {(appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? ''}
                        </h2>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>
                            {districtLabel(listing.district ?? listing.address ?? '', appLanguage)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary">{t('list.badgeType')}</Badge>
                    </div>

                    {listing.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {listing.description}
                      </p>
                    )}

                    {listing.amenities && listing.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {listing.amenities.slice(0, 4).map((amenity) => (
                          <Badge key={amenity} variant="outline">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('list.priceLabel')}</p>
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(listing.price)} {t('list.currency')}
                        </p>
                      </div>
                      <Button onClick={() => void navigate(`/tourism/accommodation/${listing.id}`)}>
                        {t('list.detailsBtn')}
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AccommodationListPage;
