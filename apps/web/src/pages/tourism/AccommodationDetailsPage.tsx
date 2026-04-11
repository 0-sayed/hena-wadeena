import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Building2,
  Clock,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  SquareDashed,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import { Skeleton } from '@/components/motion/Skeleton';
import { useListing } from '@/hooks/use-listings';
import { usePois } from '@/hooks/use-map';
import { districtLabel, formatPrice, formatRating } from '@/lib/format';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import type { AppLanguage } from '@/lib/localization';

function getContactField(
  contact: Record<string, unknown> | null,
  key: 'name' | 'phone' | 'email' | 'website',
): string | null {
  const value = contact?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const AccommodationDetailsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('accommodation');
  const { language } = useAuth();
  const appLanguage = language as AppLanguage;
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, isError, refetch } = useListing(id);

  const nearbyPoisQuery = usePois(
    listing?.location
      ? {
          lat: listing.location.y,
          lng: listing.location.x,
          radius: 15000,
          limit: 6,
        }
      : undefined,
  );

  const contactName = getContactField(listing?.contact ?? null, 'name');
  const contactPhone = getContactField(listing?.contact ?? null, 'phone');
  const contactEmail = getContactField(listing?.contact ?? null, 'email');
  const contactWebsite = getContactField(listing?.contact ?? null, 'website');

  const mapLocations = useMemo(() => {
    if (!listing?.location) return [];
    return [
      {
        id: listing.id,
        name: (appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? '',
        lat: listing.location.y,
        lng: listing.location.x,
        description: listing.address ?? listing.district ?? '',
        type: t('list.badgeType'),
        image: listing.images?.[0],
        color: '#2563eb',
      },
    ];
  }, [listing, appLanguage, t]);

  if (isLoading) {
    return (
      <Layout title={t('details.pageTitle')}>
        <div className="container py-10 space-y-6">
          <Skeleton h="h-10" className="w-32 rounded-xl" />
          <Skeleton h="h-80" className="rounded-2xl" />
          <Skeleton h="h-60" className="rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !listing) {
    return (
      <Layout title={t('details.pageTitle')}>
        <div className="container py-20 text-center space-y-4">
          <p className="text-lg text-muted-foreground">{t('details.loadingError')}</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => void navigate('/tourism/accommodation')}>
              {t('details.back')}
            </Button>
            <Button onClick={() => void refetch()}>{t('list.retry')}</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('details.pageTitle')}>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button
            variant="ghost"
            onClick={() => void navigate('/tourism/accommodation')}
            className="mb-6"
          >
            <ArrowRight className="h-4 w-4" />
            {t('details.back')}
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <img
                    src={listing.images?.[0] ?? '/placeholder.jpg'}
                    alt={(appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? ''}
                    className="h-64 w-full rounded-xl object-cover md:h-80"
                  />
                </div>
                {(listing.images ?? []).slice(1, 3).map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${(appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? ''} ${index + 2}`}
                    className="h-40 w-full rounded-xl object-cover"
                  />
                ))}
              </div>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{listing.subCategory ?? t('list.badgeType')}</Badge>
                    {listing.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                    {(appLanguage === 'en' ? listing.titleEn : listing.titleAr) ?? listing.titleAr ?? ''}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{districtLabel(listing.district ?? listing.address ?? '', appLanguage) || t('list.unspecified')}</span>
                    </div>
                    {listing.areaSqm != null && (
                      <div className="flex items-center gap-2">
                        <SquareDashed className="h-4 w-4 text-primary" />
                        <span>{listing.areaSqm} م²</span>
                      </div>
                    )}
                    {listing.openingHours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{listing.openingHours}</span>
                      </div>
                    )}
                  </div>
                  {listing.ratingAvg != null && listing.reviewCount > 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t('details.rating')} <span className="font-semibold text-foreground">{formatRating(listing.ratingAvg)}</span>
                      {' '}({listing.reviewCount} {t('details.reviewsCount')})
                    </p>
                  )}
                </CardContent>
              </Card>

              {listing.description && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('details.descriptionTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                      {(appLanguage === 'en' ? listing.descriptionEn : listing.descriptionAr || listing.description) ?? listing.descriptionAr || listing.description ?? ''}
                    </p>
                  </CardContent>
                </Card>
              )}

              {listing.amenities && listing.amenities.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('details.amenitiesTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {listing.amenities.map((amenity) => (
                        <div
                          key={amenity}
                          className="rounded-lg bg-muted/40 px-4 py-3 text-sm font-medium"
                        >
                          {amenity}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{t('details.locationTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mapLocations.length > 0 ? (
                    <InteractiveMap
                      locations={mapLocations}
                      center={[mapLocations[0].lat, mapLocations[0].lng]}
                      zoom={14}
                      className="h-[320px] w-full rounded-xl overflow-hidden"
                    />
                  ) : (
                    <div className="rounded-xl bg-muted/40 p-6 text-center text-muted-foreground">
                      {t('details.noMapData')}
                    </div>
                  )}

                  {nearbyPoisQuery.data?.data && nearbyPoisQuery.data.data.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">{t('details.nearbyTitle')}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {nearbyPoisQuery.data.data.slice(0, 4).map((poi) => (
                          <div
                            key={poi.id}
                            className="rounded-xl border border-border px-4 py-3 text-sm"
                          >
                            <p className="font-semibold text-foreground">
                              {(appLanguage === 'en' ? poi.nameEn : poi.nameAr) ?? poi.nameAr ?? ''}
                            </p>
                            <p className="text-muted-foreground">
                              {(appLanguage === 'en' ? poi.addressEn : poi.addressAr || poi.address) ?? poi.addressAr || poi.address ?? '' ?? t('list.noAddress')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-20 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{t('details.pricingTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 py-4 text-center">
                    <p className="text-sm text-muted-foreground">{t('list.priceLabel')}</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(listing.price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('list.currency')}/{listing.priceUnit || t('details.pricePerUnit')}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void navigate(`/tourism/accommodation-inquiry/${listing.id}`)}
                  >
                    <MessageSquare className="ms-2 h-5 w-5" />
                    {t('details.contactBtn')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{t('details.contactInfoTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {contactName && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>{contactName}</span>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-primary" />
                      <a href={`tel:${contactPhone}`} className="hover:underline">
                        {contactPhone}
                      </a>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <a href={`mailto:${contactEmail}`} className="hover:underline">
                        {contactEmail}
                      </a>
                    </div>
                  )}
                  {contactWebsite && (
                    <div className="flex items-center gap-3">
                      <Home className="h-4 w-4 text-primary" />
                      <a
                        href={contactWebsite.startsWith('http') ? contactWebsite : `https://${contactWebsite}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {contactWebsite}
                      </a>
                    </div>
                  )}
                  {!contactName && !contactPhone && !contactEmail && !contactWebsite && (
                    <p className="text-muted-foreground">{t('details.contactHidden')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AccommodationDetailsPage;
