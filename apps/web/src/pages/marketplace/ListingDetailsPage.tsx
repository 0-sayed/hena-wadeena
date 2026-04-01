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
  const { user, isAuthenticated } = useAuth();
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

    return [
      {
        id: listing.id,
        name: listing.titleAr,
        lat: listing.location.y,
        lng: listing.location.x,
        description: listing.address ?? listing.district ?? '',
        type: listingCategoryLabel(listing.category),
        image: listing.images?.[0],
        color: '#ea580c',
      },
    ];
  }, [listing]);

  if (isLoading) {
    return (
      <Layout>
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
      <Layout>
        <div className="container py-20 text-center space-y-4">
          <p className="text-lg text-muted-foreground">تعذر تحميل تفاصيل الإعلان.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => void navigate('/marketplace')}>
              العودة إلى السوق
            </Button>
            <Button onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <img
                    src={listing.images?.[0] ?? '/placeholder.jpg'}
                    alt={listing.titleAr}
                    className="h-64 w-full rounded-xl object-cover md:h-80"
                  />
                </div>
                {(listing.images ?? []).slice(1, 3).map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${listing.titleAr} ${index + 2}`}
                    className="h-40 w-full rounded-xl object-cover"
                  />
                ))}
              </div>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{listingCategoryLabel(listing.category)}</Badge>
                    <Badge variant="outline">{transactionLabel(listing.transaction)}</Badge>
                    {listing.subCategory && <Badge variant="outline">{listing.subCategory}</Badge>}
                    {listing.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                    {listing.titleAr}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{districtLabel(listing.district ?? listing.address ?? 'غير محدد')}</span>
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
                      التقييم:{' '}
                      <span className="font-semibold text-foreground">
                        {formatRating(listing.ratingAvg)}
                      </span>{' '}
                      ({listing.reviewCount} تقييم)
                    </p>
                  )}
                </CardContent>
              </Card>

              {listing.description && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">وصف الإعلان</CardTitle>
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
                    <CardTitle className="text-lg">تفاصيل إضافية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(listing.features).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-border/60 p-4 text-sm">
                          <p className="mb-1 flex items-center gap-2 font-medium text-foreground">
                            <Tag className="h-4 w-4 text-primary" />
                            {key}
                          </p>
                          <p className="text-muted-foreground">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">الموقع</CardTitle>
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
                      لا تتوفر إحداثيات دقيقة لهذا الإعلان حالياً.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-4 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">ملخص الإعلان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 py-4 text-center">
                    <p className="text-sm text-muted-foreground">السعر</p>
                    <p className="text-3xl font-bold text-primary">{formatPrice(listing.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      جنيه/{listing.priceUnit || 'الوحدة'}
                    </p>
                  </div>

                  {listing.category === 'accommodation' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void navigate(`/tourism/accommodation/${listing.id}`)}
                    >
                      <MessageSquare className="ml-2 h-5 w-5" />
                      عرض صفحة السكن
                    </Button>
                  )}

                  {isOwner ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void navigate('/marketplace/inquiries?tab=received')}
                    >
                      <MessageSquare className="ml-2 h-5 w-5" />
                      متابعة الاستفسارات الواردة
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
                      <MessageSquare className="ml-2 h-5 w-5" />
                      إرسال استفسار إلى المالك
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">مالك الإعلان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={owner?.avatar_url ?? undefined} alt={owner?.full_name} />
                      <AvatarFallback>{ownerInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {owner?.full_name ?? contactName ?? 'صاحب الإعلان'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {owner?.role ?? 'مالك الإعلان'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    هذا الإعلان مرتبط بصاحبه مباشرة عبر النظام، ويمكنك إرسال استفسارك من الزر
                    المخصص ليصل إلى صندوق الوارد الخاص به.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">بيانات التواصل</CardTitle>
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
                    <p className="text-muted-foreground">لا توجد بيانات تواصل منشورة لهذا الإعلان.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
