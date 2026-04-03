import { Link, useNavigate, useParams } from 'react-router';
import { AlertCircle, Clock, Shield, Star, Users } from 'lucide-react';
import { GuideLanguage, GuideSpecialty, NvDistrict } from '@hena-wadeena/types';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { useGuide, useGuidePackages } from '@/hooks/use-guides';
import { useCanBook } from '@/hooks/use-bookings';
import { usePublicUsers } from '@/hooks/use-users';
import {
  areaLabels,
  formatRating,
  languageLabels,
  piastresToEgp,
  specialtyLabels,
} from '@/lib/format';
import type { PublicUserProfile } from '@/services/api';

function getGuideName(profile?: PublicUserProfile) {
  return profile?.display_name ?? profile?.full_name ?? 'مرشد سياحي';
}

const GuideProfilePage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: guide, isLoading, error, refetch } = useGuide(id);
  const {
    data: packages,
    isLoading: isLoadingPackages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGuidePackages(id);
  const publicUsers = usePublicUsers(guide ? [guide.userId] : []);
  const canBook = useCanBook();

  const guideName = guide ? getGuideName(publicUsers.data?.[guide.userId]) : 'مرشد سياحي';

  if (isLoading) {
    return (
      <Layout title="ملف المرشد">
        <div className="container flex justify-center py-20">
          <div className="h-64 w-full max-w-2xl animate-pulse rounded-2xl bg-muted" />
        </div>
      </Layout>
    );
  }

  if (error || !guide) {
    return (
      <Layout title="ملف المرشد">
        <div className="container flex flex-col items-center gap-4 py-20">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg text-muted-foreground">تعذّر تحميل بيانات المرشد</p>
          <Button variant="outline" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="ملف المرشد">
      <PageTransition>
        {guide.coverImage && (
          <div className="h-56 overflow-hidden">
            <img src={guide.coverImage} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
          <SR>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8">
                <div className="flex flex-col items-center gap-6 md:flex-row">
                  <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg">
                    <img
                      src={guide.profileImage ?? '/placeholder.jpg'}
                      alt={guideName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1 text-center md:text-end">
                    <h1 className="mb-2 text-3xl font-bold text-foreground">{guideName}</h1>
                    <p className="mb-3 line-clamp-3 text-muted-foreground">
                      {guide.bioAr ?? guide.bioEn ?? 'مرشد معتمد لرحلات الوادي الجديد'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                      {guide.licenseVerified && (
                        <Badge className="bg-green-500 text-white">
                          <Shield className="ms-1 h-3 w-3" />
                          مرخّص
                        </Badge>
                      )}
                      {guide.languages.map((language) => (
                        <Badge key={language} variant="outline">
                          {languageLabels[language as GuideLanguage] ?? language}
                        </Badge>
                      ))}
                      {guide.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          {specialtyLabels[specialty as GuideSpecialty] ?? specialty}
                        </Badge>
                      ))}
                      {guide.areasOfOperation.map((area) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {areaLabels[area as NvDistrict] ?? area}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-[120px] rounded-xl border bg-white/50 p-4 text-center">
                    <div className="mb-1 flex items-center justify-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <span className="text-2xl font-bold">{formatRating(guide.ratingAvg)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{guide.ratingCount} تقييم</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {guide.reviewCount} مراجعة
                    </p>
                    <p className="mt-2 text-lg font-bold text-primary">
                      {piastresToEgp(guide.basePrice)}/يوم
                    </p>
                    <p className="text-xs text-muted-foreground">{guide.packageCount} باقة</p>
                  </div>
                </div>
              </div>
            </Card>
          </SR>

          <SR>
            <div>
              <h2 className="mb-4 text-2xl font-bold">الباقات المتاحة</h2>
              {isLoadingPackages ? (
                <div className="h-32 w-full animate-pulse rounded-2xl bg-muted" />
              ) : packages.length === 0 ? (
                <p className="text-muted-foreground">لا توجد باقات متاحة حالياً</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className="transition-all hover:shadow-lg">
                      <CardContent className="p-0">
                        {pkg.images?.[0] && (
                          <img
                            src={pkg.images[0]}
                            alt={pkg.titleAr}
                            className="h-40 w-full rounded-t-lg object-cover"
                          />
                        )}
                        <div className="space-y-3 p-5">
                          <h3 className="text-lg font-bold">{pkg.titleAr}</h3>
                          {pkg.description && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {pkg.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {pkg.durationHours} ساعة
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              حتى {pkg.maxPeople} أفراد
                            </span>
                          </div>

                          {pkg.includes && pkg.includes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pkg.includes.map((item) => (
                                <Badge key={item} variant="outline" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {pkg.attractionSlugs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pkg.attractionSlugs.map((slug) => (
                                <Link
                                  key={slug}
                                  to={`/tourism/attraction/${slug}`}
                                  className="text-xs text-primary underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {slug}
                                </Link>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t pt-3">
                            <span className="text-2xl font-bold text-primary">
                              {piastresToEgp(pkg.price)}{' '}
                              <span className="text-sm font-normal">/ فرد</span>
                            </span>
                            {canBook && (
                              <Link to={`/tourism/book-package/${pkg.id}`}>
                                <Button size="sm">احجز الآن</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <LoadMoreButton
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </div>
          </SR>

          <Button variant="ghost" onClick={() => void navigate(-1)} className="mt-4">
            رجوع
          </Button>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default GuideProfilePage;
