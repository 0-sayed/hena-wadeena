import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { AlertCircle, Clock, Shield, Star, ThumbsUp, Users } from 'lucide-react';
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
import { useGuideReviews, useMarkHelpful } from '@/hooks/use-reviews';
import { useAuth } from '@/hooks/use-auth';
import {
  areaLabel,
  formatRating,
  languageLabel,
  piastresToEgp,
  specialtyLabel,
} from '@/lib/format';
import type { PublicUserProfile } from '@/services/api';
import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '@/lib/localization';

function getGuideName(profile: PublicUserProfile | undefined, defaultName: string) {
  return profile?.display_name ?? profile?.full_name ?? defaultName;
}

const GuideProfilePage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('guides');

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
  const { isAuthenticated, language } = useAuth();
  const appLanguage = language as AppLanguage;
  const {
    data: reviews,
    total: reviewsTotal,
    isLoading: isLoadingReviews,
    isFetchingNextPage: isFetchingNextReviews,
    hasNextPage: hasNextReviews,
    fetchNextPage: fetchNextReviews,
  } = useGuideReviews(id);
  const [pendingHelpfulId, setPendingHelpfulId] = useState<string | null>(null);
  const markHelpfulMutation = useMarkHelpful();

  const guideName = guide
    ? getGuideName(publicUsers.data?.[guide.userId], t('guide.defaultName'))
    : t('guide.defaultName');

  if (isLoading) {
    return (
      <Layout title={t('profileTitle')}>
        <div className="container flex justify-center py-20">
          <div className="h-64 w-full max-w-2xl animate-pulse rounded-2xl bg-muted" />
        </div>
      </Layout>
    );
  }

  if (error || !guide) {
    return (
      <Layout title={t('profileTitle')}>
        <div className="container flex flex-col items-center gap-4 py-20">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg text-muted-foreground">{t('loadErrorProfile')}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t('retryBtn')}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('profileTitle')}>
      <PageTransition>
        {guide.coverImage && (
          <div className="h-56 overflow-hidden">
            <img
              src={guide.coverImage}
              alt=""
              className="h-full w-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
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
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 text-center md:text-end">
                    <h1 className="mb-2 text-3xl font-bold text-foreground">{guideName}</h1>
                    <p className="mb-3 line-clamp-3 text-muted-foreground">
                      {guide.bioAr ?? guide.bioEn ?? t('guide.defaultBio')}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                      {guide.licenseVerified && (
                        <Badge className="bg-green-500 text-white">
                          <Shield className="ms-1 h-3 w-3" />
                          {t('guide.licensedBadge')}
                        </Badge>
                      )}
                      {guide.languages.map((langType) => (
                        <Badge key={langType} variant="outline">
                          {languageLabel(langType, appLanguage)}
                        </Badge>
                      ))}
                      {guide.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          {specialtyLabel(specialty, appLanguage)}
                        </Badge>
                      ))}
                      {guide.areasOfOperation.map((area) => (
                        <Badge key={area} variant="outline" className="text-xs">
                          {areaLabel(area, appLanguage)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-[120px] rounded-xl border bg-white/50 p-4 text-center">
                    <div className="mb-1 flex items-center justify-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <span className="text-2xl font-bold">{formatRating(guide.ratingAvg)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('stats.ratingCount', { count: guide.ratingCount })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('stats.reviewCount', { count: guide.reviewCount })}
                    </p>
                    <p className="mt-2 text-lg font-bold text-primary">
                      {piastresToEgp(guide.basePrice)}
                      <span className="text-sm font-normal">{t('guide.perDay')}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('stats.packageCount', { count: guide.packageCount })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </SR>

          <SR>
            <div>
              <h2 className="mb-4 text-2xl font-bold">{t('packages.title')}</h2>
              {isLoadingPackages ? (
                <div className="h-32 w-full animate-pulse rounded-2xl bg-muted" />
              ) : packages.length === 0 ? (
                <p className="text-muted-foreground">{t('packages.empty')}</p>
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
                            loading="lazy"
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
                              {t('packages.hours', { count: pkg.durationHours })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {t('packages.upToPeople', { count: pkg.maxPeople })}
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
                              <span className="text-sm font-normal">{t('packages.perPerson')}</span>
                            </span>
                            {canBook && (
                              <Link to={`/tourism/book-package/${pkg.id}`}>
                                <Button size="sm">{t('packages.bookNow')}</Button>
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

          <SR>
            <div>
              <h2 className="mb-4 text-2xl font-bold">{t('reviews.title')}</h2>

              {isLoadingReviews ? (
                <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
              ) : reviewsTotal === 0 ? (
                <p className="text-muted-foreground">{t('reviews.empty')}</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="space-y-3 p-5">
                        {/* Stars */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating
                                  ? 'fill-yellow-500 text-yellow-500'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Comment */}
                        {review.comment && (
                          <p className="text-sm text-foreground">{review.comment}</p>
                        )}

                        {/* Date */}
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString(
                            appLanguage === 'en' ? 'en-US' : 'ar-EG',
                          )}
                        </p>

                        {/* Guide reply */}
                        {review.guideReply && (
                          <div className="ms-4 border-s-2 border-primary/30 ps-4">
                            <p className="mb-1 text-xs font-semibold text-primary">
                              {t('reviews.guideReply')}
                            </p>
                            <p className="text-sm text-muted-foreground">{review.guideReply}</p>
                          </div>
                        )}

                        {/* Helpful */}
                        {isAuthenticated && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            disabled={pendingHelpfulId === review.id}
                            onClick={() => {
                              setPendingHelpfulId(review.id);
                              markHelpfulMutation.mutate(
                                { reviewId: review.id, guideId: id },
                                {
                                  onSettled: () => setPendingHelpfulId(null),
                                  onError: (err) =>
                                    toast.error(
                                      err instanceof Error ? err.message : t('reviews.error'),
                                    ),
                                },
                              );
                            }}
                          >
                            <ThumbsUp className="me-1 h-3 w-3" />
                            {t('reviews.helpful', { count: review.helpfulCount })}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <LoadMoreButton
                hasNextPage={hasNextReviews}
                isFetchingNextPage={isFetchingNextReviews}
                fetchNextPage={fetchNextReviews}
              />
            </div>
          </SR>

          <Button variant="ghost" onClick={() => void navigate(-1)} className="mt-4">
            {t('backBtn')}
          </Button>
        </div>
      </PageTransition>
    </Layout>
  );
};

export default GuideProfilePage;
