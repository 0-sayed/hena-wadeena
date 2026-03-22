import { Layout } from '@/components/layout/Layout';
import { useParams, useNavigate, Link } from 'react-router';
import { Star, Clock, Users, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { useGuide, useGuidePackages } from '@/hooks/use-guides';
import {
  piastresToEgp,
  formatRating,
  languageLabels,
  specialtyLabels,
  areaLabels,
} from '@/lib/format';
import { GuideLanguage, GuideSpecialty, NvDistrict } from '@hena-wadeena/types';

const GuideProfilePage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: guide, isLoading, error, refetch } = useGuide(id);
  const {
    data: packagesData,
    isLoading: isLoadingPackages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGuidePackages(id);

  const packages = packagesData ? packagesData.pages.flatMap((p) => p.data) : undefined;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 flex justify-center">
          <div className="h-64 w-full max-w-2xl rounded-2xl bg-muted animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (error || !guide) {
    return (
      <Layout>
        <div className="container py-20 flex flex-col items-center gap-4">
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
    <Layout>
      <PageTransition>
        {/* Cover image */}
        {guide.coverImage && (
          <div className="h-56 overflow-hidden">
            <img src={guide.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="container px-4 max-w-4xl mx-auto py-10 space-y-8">
          {/* Guide Header */}
          <SR>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <img
                    src={guide.profileImage ?? '/placeholder.jpg'}
                    alt={guide.bioAr?.slice(0, 30) ?? 'مرشد'}
                    className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <div className="text-center md:text-right flex-1">
                    <p className="text-muted-foreground mb-3 line-clamp-3">{guide.bioAr}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {guide.licenseVerified && (
                        <Badge className="bg-green-500 text-white">
                          <Shield className="h-3 w-3 ml-1" />
                          مرخّص
                        </Badge>
                      )}
                      {guide.languages.map((l) => (
                        <Badge key={l} variant="outline">
                          {languageLabels[l as GuideLanguage] ?? l}
                        </Badge>
                      ))}
                      {guide.specialties.map((s) => (
                        <Badge key={s} variant="secondary">
                          {specialtyLabels[s as GuideSpecialty] ?? s}
                        </Badge>
                      ))}
                      {guide.areasOfOperation.map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">
                          {areaLabels[a as NvDistrict] ?? a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-xl border min-w-[120px]">
                    <div className="flex items-center gap-1 justify-center mb-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-2xl font-bold">{formatRating(guide.ratingAvg)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{guide.ratingCount} تقييم</p>
                    <p className="text-xs text-muted-foreground mt-1">{guide.reviewCount} مراجعة</p>
                    <p className="text-lg font-bold text-primary mt-2">
                      {piastresToEgp(guide.basePrice)}/يوم
                    </p>
                    <p className="text-xs text-muted-foreground">{guide.packageCount} باقة</p>
                  </div>
                </div>
              </div>
            </Card>
          </SR>

          {/* Tour Packages */}
          <SR>
            <div>
              <h2 className="text-2xl font-bold mb-4">الباقات المتاحة</h2>
              {isLoadingPackages ? (
                <div className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
              ) : packages && packages.length === 0 ? (
                <p className="text-muted-foreground">لا توجد باقات متاحة حالياً</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages?.map((pkg) => (
                    <Card key={pkg.id} className="hover:shadow-lg transition-all">
                      <CardContent className="p-0">
                        {pkg.images?.[0] && (
                          <img
                            src={pkg.images[0]}
                            alt={pkg.titleAr}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                        )}
                        <div className="p-5 space-y-3">
                          <h3 className="text-lg font-bold">{pkg.titleAr}</h3>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
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
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {slug}
                                </Link>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <span className="text-2xl font-bold text-primary">
                              {piastresToEgp(pkg.price)}{' '}
                              <span className="text-sm font-normal">/ فرد</span>
                            </span>
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
