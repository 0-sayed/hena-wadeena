import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  MessageSquare,
  Phone,
  SquareDashed,
  Tag,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import { Skeleton } from '@/components/motion/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useListing } from '@/hooks/use-listings';
import { usePublicUsers } from '@/hooks/use-users';
import {
  districtLabel,
  formatPrice,
  formatRating,
  listingCategoryLabel,
  transactionLabel,
} from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';

const FEATURE_KEY_LABELS: Record<string, { ar: string; en: string }> = {
  nrea_cert_number: { ar: 'رقم شهادة NREA', en: 'NREA certificate number' },
  services: { ar: 'الخدمات', en: 'Services' },
  brands: { ar: 'العلامات التجارية', en: 'Brands' },
  capacity_kw: { ar: 'السعة (كيلوواط)', en: 'Capacity (kW)' },
  warranty_years: { ar: 'سنوات الضمان', en: 'Warranty years' },
  panel_type: { ar: 'نوع الألواح', en: 'Panel type' },
  inverter_type: { ar: 'نوع العاكس', en: 'Inverter type' },
};

const FEATURE_VALUE_LABELS: Record<string, { ar: string; en: string }> = {
  residential: { ar: 'سكني', en: 'Residential' },
  agricultural: { ar: 'زراعي', en: 'Agricultural' },
  commercial: { ar: 'تجاري', en: 'Commercial' },
  industrial: { ar: 'صناعي', en: 'Industrial' },
  grid_connected: { ar: 'متصل بالشبكة', en: 'Grid-connected' },
  off_grid: { ar: 'مستقل', en: 'Off-grid' },
};

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  admin: { ar: 'مدير', en: 'Admin' },
  tourist: { ar: 'سائح', en: 'Tourist' },
  resident: { ar: 'مقيم', en: 'Resident' },
  student: { ar: 'طالب', en: 'Student' },
  merchant: { ar: 'تاجر', en: 'Merchant' },
  driver: { ar: 'سائق', en: 'Driver' },
  guide: { ar: 'مرشد سياحي', en: 'Tour guide' },
  investor: { ar: 'مستثمر', en: 'Investor' },
  farmer: { ar: 'مزارع', en: 'Farmer' },
  reviewer: { ar: 'مراجع', en: 'Reviewer' },
};

function formatFeatureLabel(key: string, language: AppLanguage): string {
  const entry = FEATURE_KEY_LABELS[key];
  if (!entry) return key;
  return pickLocalizedCopy(language, entry);
}

function formatFeatureValue(value: unknown, language: AppLanguage): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const entry = FEATURE_VALUE_LABELS[String(v)];
        return entry ? pickLocalizedCopy(language, entry) : String(v);
      })
      .join(language === 'en' ? ', ' : '، ');
  }

  const str = String(value);
  const entry = FEATURE_VALUE_LABELS[str];
  return entry ? pickLocalizedCopy(language, entry) : str;
}

function formatRoleLabel(role: string, language: AppLanguage): string {
  const entry = ROLE_LABELS[role];
  return entry ? pickLocalizedCopy(language, entry) : role;
}

function getContactField(
  contact: Record<string, unknown> | null,
  key: 'name' | 'phone' | 'email' | 'website',
) {
  const value = contact?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default function ListingDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, language: rawLanguage } = useAuth();
  const language: AppLanguage = rawLanguage === 'en' ? 'en' : 'ar';
  const { data: listing, isLoading, isError, refetch } = useListing(id);
  const ownerProfiles = usePublicUsers(listing ? [listing.ownerId] : []);

  const contactName = getContactField(listing?.contact ?? null, 'name');
  const contactPhone = getContactField(listing?.contact ?? null, 'phone');
  const contactWebsite = getContactField(listing?.contact ?? null, 'website');
  const owner = listing ? ownerProfiles.data?.[listing.ownerId] : undefined;
  const ownerInitials = owner?.full_name
    ? owner.full_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'HW';
  const isOwner = user?.id === listing?.ownerId;

  const mapLocations = useMemo(() => {
    if (!listing?.location) return [];

    const localizedTitle = pickLocalizedField(language, {
      ar: listing.titleAr,
      en: listing.titleEn,
    });

    return [
      {
        id: listing.id,
        name: localizedTitle,
        lat: listing.location.y,
        lng: listing.location.x,
        description: listing.address ?? listing.district ?? '',
        type: listingCategoryLabel(listing.category, language),
        image: listing.images?.[0],
        color: '#ea580c',
      },
    ];
  }, [language, listing]);

  const pageTitle = pickLocalizedCopy(language, { ar: 'تفاصيل الإعلان', en: 'Listing details' });

  if (isLoading) {
    return (
      <Layout title={pageTitle}>
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
      <Layout title={pageTitle}>
        <div className="container py-20 text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            {pickLocalizedCopy(language, {
              ar: 'تعذر تحميل تفاصيل الإعلان.',
              en: 'Unable to load listing details.',
            })}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => void navigate('/marketplace')}>
              {pickLocalizedCopy(language, { ar: 'العودة إلى السوق', en: 'Back to marketplace' })}
            </Button>
            <Button onClick={() => void refetch()}>
              {pickLocalizedCopy(language, { ar: 'إعادة المحاولة', en: 'Retry' })}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const localizedTitle = pickLocalizedField(language, {
    ar: listing.titleAr,
    en: listing.titleEn,
  });
  const backLabel = pickLocalizedCopy(language, { ar: 'العودة', en: 'Back' });
  const descriptionLabel = pickLocalizedCopy(language, { ar: 'وصف الإعلان', en: 'Description' });
  const additionalDetailsLabel = pickLocalizedCopy(language, {
    ar: 'تفاصيل إضافية',
    en: 'Additional details',
  });
  const locationLabel = pickLocalizedCopy(language, { ar: 'الموقع', en: 'Location' });
  const listingSummaryLabel = pickLocalizedCopy(language, {
    ar: 'ملخص الإعلان',
    en: 'Listing summary',
  });
  const listingSummaryAriaLabel = pickLocalizedCopy(language, {
    ar: 'ملخص وتواصل الإعلان',
    en: 'Listing summary and contact',
  });
  const ownerLabel = pickLocalizedCopy(language, { ar: 'مالك الإعلان', en: 'Listing owner' });
  const contactDetailsLabel = pickLocalizedCopy(language, {
    ar: 'بيانات التواصل',
    en: 'Contact details',
  });

  return (
    <Layout title={pageTitle}>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {backLabel}
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <img
                    src={listing.images?.[0] ?? '/placeholder.jpg'}
                    alt={localizedTitle}
                    className="h-64 w-full rounded-xl object-cover md:h-80"
                    loading="eager"
                  />
                </div>
                {(listing.images ?? []).slice(1).map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${localizedTitle} ${index + 2}`}
                    className="h-40 w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                ))}
              </div>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {listingCategoryLabel(listing.category, language)}
                    </Badge>
                    <Badge variant="outline">
                      {transactionLabel(listing.transaction, language)}
                    </Badge>
                    {listing.subCategory && <Badge variant="outline">{listing.subCategory}</Badge>}
                    {listing.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                    {localizedTitle}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>
                        {districtLabel(
                          listing.district ?? listing.address ?? pickLocalizedCopy(language, {
                            ar: 'غير محدد',
                            en: 'Unspecified',
                          }),
                          language,
                        )}
                      </span>
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
                      {pickLocalizedCopy(language, { ar: 'التقييم', en: 'Rating' })}:{' '}
                      <span className="font-semibold text-foreground">
                        {formatRating(listing.ratingAvg)}
                      </span>{' '}
                      (
                      {listing.reviewCount}{' '}
                      {pickLocalizedCopy(language, { ar: 'تقييم', en: 'reviews' })}
                      )
                    </p>
                  )}
                </CardContent>
              </Card>

              {listing.description && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{descriptionLabel}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                      {listing.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {listing.amenities && listing.amenities.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">المميزات</CardTitle>
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

              {listing.features && Object.keys(listing.features).length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{additionalDetailsLabel}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(listing.features).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-border/60 p-4 text-sm">
                          <p className="mb-1 flex items-center gap-2 font-medium text-foreground">
                            <Tag className="h-4 w-4 text-primary" />
                            {formatFeatureLabel(key, language)}
                          </p>
                          <p className="text-muted-foreground">
                            {formatFeatureValue(value, language)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{locationLabel}</CardTitle>
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
                      {pickLocalizedCopy(language, {
                        ar: 'لا تتوفر إحداثيات دقيقة لهذا الإعلان حالياً.',
                        en: 'Precise coordinates are not available for this listing yet.',
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside
              aria-label={listingSummaryAriaLabel}
              className="space-y-6 lg:sticky lg:top-20 lg:self-start"
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{listingSummaryLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 py-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(language, { ar: 'السعر', en: 'Price' })}
                    </p>
                    <p className="text-3xl font-bold text-primary">{formatPrice(listing.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(language, { ar: 'جنيه', en: 'EGP' })}/
                      {listing.priceUnit ||
                        pickLocalizedCopy(language, { ar: 'الوحدة', en: 'unit' })}
                    </p>
                  </div>

                  {listing.category === 'accommodation' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void navigate(`/tourism/accommodation/${listing.id}`)}
                    >
                      <MessageSquare className="ms-2 h-5 w-5" />
                      {pickLocalizedCopy(language, {
                        ar: 'عرض صفحة السكن',
                        en: 'View accommodation page',
                      })}
                    </Button>
                  )}

                  {isOwner ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void navigate('/marketplace/inquiries?tab=received')}
                    >
                      <MessageSquare className="ms-2 h-5 w-5" />
                      {pickLocalizedCopy(language, {
                        ar: 'متابعة الاستفسارات الواردة',
                        en: 'Review incoming inquiries',
                      })}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() =>
                        void navigate(
                          isAuthenticated ? `/marketplace/inquiry/${listing.id}` : '/login',
                        )
                      }
                    >
                      <MessageSquare className="ms-2 h-5 w-5" />
                      {pickLocalizedCopy(language, {
                        ar: 'إرسال استفسار إلى المالك',
                        en: 'Send inquiry to owner',
                      })}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{ownerLabel}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={owner?.avatar_url ?? undefined} alt={owner?.full_name} />
                      <AvatarFallback>{ownerInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {owner?.full_name ??
                          contactName ??
                          pickLocalizedCopy(language, {
                            ar: 'صاحب الإعلان',
                            en: 'Listing owner',
                          })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {owner?.role
                          ? formatRoleLabel(owner.role, language)
                          :
                          pickLocalizedCopy(language, {
                            ar: 'مالك الإعلان',
                            en: 'Listing owner',
                          })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pickLocalizedCopy(language, {
                      ar: 'هذا الإعلان مرتبط بصاحبه مباشرة عبر النظام، ويمكنك إرسال استفسارك من الزر المخصص ليصل إلى صندوق الوارد الخاص به.',
                      en: 'This listing is tied directly to its owner in the system, and your inquiry will be delivered to the owner inbox from the dedicated action above.',
                    })}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">{contactDetailsLabel}</CardTitle>
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
                  {contactWebsite && (
                    <div className="flex items-center gap-3">
                      <ExternalLink className="h-4 w-4 text-primary" />
                      <a
                        href={
                          contactWebsite.startsWith('http')
                            ? contactWebsite
                            : `https://${contactWebsite}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {contactWebsite}
                      </a>
                    </div>
                  )}
                  {!contactName && !contactPhone && !contactWebsite && (
                    <p className="text-muted-foreground">
                      {pickLocalizedCopy(language, {
                        ar: 'لا توجد بيانات تواصل منشورة لهذا الإعلان.',
                        en: 'No contact details are published for this listing.',
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
}
