import { Layout } from '@/components/layout/Layout';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, Star, Clock, Calendar, Sun, Users, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { useAttraction, useNearbyAttractions } from '@/hooks/use-attractions';
import {
  attractionTypeLabels,
  areaLabels,
  bestSeasonLabels,
  bestTimeOfDayLabels,
  difficultyLabels,
  piastresToEgp,
  formatRating,
} from '@/lib/format';

const AttractionDetailsPage = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: attraction, isLoading, error, refetch } = useAttraction(slug);
  const { data: nearby } = useNearbyAttractions(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 flex justify-center">
          <div className="h-96 w-full max-w-2xl rounded-2xl bg-muted animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (error || !attraction) {
    return (
      <Layout>
        <div className="container py-20 flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg text-muted-foreground">تعذّر تحميل بيانات المعلم السياحي</p>
          <Button variant="outline" onClick={() => void refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      </Layout>
    );
  }

  const heroImage = attraction.images?.[0] ?? attraction.thumbnail ?? '/placeholder.jpg';

  return (
    <Layout>
      <PageTransition>
        {/* Hero Image */}
        <div className="relative h-72 md:h-96 overflow-hidden">
          <img src={heroImage} alt={attraction.nameAr} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <Button
            variant="ghost"
            className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm"
            onClick={() => void navigate('/tourism/attractions')}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
        </div>

        <div className="container px-4 py-10 max-w-4xl mx-auto space-y-10">
          {/* Title + badges */}
          <SR>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{attractionTypeLabels[attraction.type]}</Badge>
                <Badge variant="outline">{areaLabels[attraction.area]}</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {attraction.nameAr}
              </h1>
              {attraction.ratingAvg != null && (
                <div className="flex items-center gap-2 text-accent">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-bold text-lg">{formatRating(attraction.ratingAvg)}</span>
                  <span className="text-muted-foreground text-sm">
                    ({attraction.reviewCount} تقييم)
                  </span>
                </div>
              )}
            </div>
          </SR>

          {/* Description */}
          {attraction.descriptionAr && (
            <SR>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {attraction.descriptionAr}
              </p>
            </SR>
          )}

          {/* History */}
          {attraction.historyAr && (
            <SR>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">التاريخ</h2>
                <p className="text-muted-foreground leading-relaxed">{attraction.historyAr}</p>
              </div>
            </SR>
          )}

          {/* Details grid */}
          <SR>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {attraction.durationHours && (
                <Card>
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">المدة</span>
                    <span className="font-semibold">{attraction.durationHours} ساعة</span>
                  </CardContent>
                </Card>
              )}
              {attraction.difficulty && (
                <Card>
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">الصعوبة</span>
                    <span className="font-semibold">{difficultyLabels[attraction.difficulty]}</span>
                  </CardContent>
                </Card>
              )}
              {attraction.bestSeason && (
                <Card>
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">أفضل موسم</span>
                    <span className="font-semibold">{bestSeasonLabels[attraction.bestSeason]}</span>
                  </CardContent>
                </Card>
              )}
              {attraction.bestTimeOfDay && (
                <Card>
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <Sun className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">أفضل وقت</span>
                    <span className="font-semibold">
                      {bestTimeOfDayLabels[attraction.bestTimeOfDay]}
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>
          </SR>

          {/* Opening hours */}
          {attraction.openingHours && (
            <SR>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">مواعيد الفتح</h2>
                <p className="text-muted-foreground">{attraction.openingHours}</p>
              </div>
            </SR>
          )}

          {/* Entry fee */}
          {attraction.entryFee && (
            <SR>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">رسوم الدخول</h2>
                <div className="space-y-1 text-muted-foreground">
                  {attraction.entryFee.adultsPiasters != null && (
                    <p>بالغين: {piastresToEgp(attraction.entryFee.adultsPiasters)}</p>
                  )}
                  {attraction.entryFee.childrenPiasters != null && (
                    <p>أطفال: {piastresToEgp(attraction.entryFee.childrenPiasters)}</p>
                  )}
                  {attraction.entryFee.foreignersPiasters != null && (
                    <p>أجانب: {piastresToEgp(attraction.entryFee.foreignersPiasters)}</p>
                  )}
                </div>
              </div>
            </SR>
          )}

          {/* Tips */}
          {attraction.tips && attraction.tips.length > 0 && (
            <SR>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">نصائح للزيارة</h2>
                <ul className="space-y-2">
                  {attraction.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-accent mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </SR>
          )}

          {/* Map placeholder */}
          {attraction.location && (
            <SR>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3">الموقع</h2>
                <div className="flex items-center gap-2 text-muted-foreground p-4 rounded-xl bg-muted">
                  <MapPin className="h-5 w-5 text-accent" />
                  <span>
                    {attraction.location.y.toFixed(4)}, {attraction.location.x.toFixed(4)}
                  </span>
                </div>
              </div>
            </SR>
          )}

          {/* Nearby attractions */}
          {nearby && nearby.length > 0 && (
            <SR>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">معالم قريبة</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {nearby.map((a) => (
                    <Link key={a.id} to={`/tourism/attraction/${a.slug}`} className="block">
                      <Card className="group overflow-hidden cursor-pointer hover:border-primary/40 transition-colors">
                        <div className="aspect-[4/3] overflow-hidden">
                          <img
                            src={a.thumbnail ?? '/placeholder.jpg'}
                            alt={a.nameAr}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {a.nameAr}
                          </h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">
                              {attractionTypeLabels[a.type]}
                            </Badge>
                            {a.ratingAvg != null && (
                              <span className="flex items-center gap-0.5 mr-1">
                                <Star className="h-3 w-3 text-accent fill-current" />
                                {formatRating(a.ratingAvg)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </SR>
          )}
        </div>
      </PageTransition>
    </Layout>
  );
};

export default AttractionDetailsPage;
