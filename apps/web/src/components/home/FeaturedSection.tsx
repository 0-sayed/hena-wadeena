import { Link } from 'react-router';
import { ArrowLeft, MapPin, Star, Clock } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SR } from '@/components/motion/ScrollReveal';
import { CardGridSkeleton } from '@/components/motion/Skeleton';
import { useAttractions } from '@/hooks/use-attractions';
import { useAuth } from '@/hooks/use-auth';
import { attractionTypeLabel, formatRating } from '@/lib/format';
import { pickLocalizedField } from '@/lib/localization';

export function FeaturedSection() {
  const { data: featuredAttractions, isLoading } = useAttractions({ featured: true }, 4);
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          badge: 'Featured destinations',
          title: 'Featured destinations',
          description: 'Discover some of the most beautiful attractions across New Valley',
          viewAll: 'View all',
          hoursSuffix: 'hours',
        }
      : {
          badge: 'وجهات مميزة',
          title: 'وجهات مميزة',
          description: 'اكتشف أجمل المعالم السياحية في الوادي الجديد',
          viewAll: 'عرض الكل',
          hoursSuffix: 'ساعة',
        };

  return (
    <section className="py-16 sm:py-20 md:py-24">
      <div className="container px-4">
        <SR
          direction="up"
          className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-accent">{copy.badge}</span>
            </div>
            <h2 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              {copy.title}
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">{copy.description}</p>
          </div>
          <Link to="/tourism" className="w-full md:w-auto">
            <Button
              variant="outline"
              className="btn-press w-full gap-2 transition-all duration-300 hover:scale-[1.03] md:w-auto"
            >
              {copy.viewAll}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </SR>

        {isLoading ? (
          <CardGridSkeleton count={3} />
        ) : (
          <SR stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-7 xl:grid-cols-3">
            {featuredAttractions.map((attraction) => {
              const attractionName = pickLocalizedField(language, {
                ar: attraction.nameAr,
                en: attraction.nameEn,
              });
              const attractionDescription = pickLocalizedField(language, {
                ar: attraction.descriptionAr,
                en: attraction.descriptionEn,
              });

              return (
                <Link key={attraction.id} to={`/tourism/attraction/${attraction.slug}`}>
                  <Card className="group h-full overflow-hidden rounded-2xl border-border/50 transition-all duration-400 hover-lift hover:border-primary/40 hover:shadow-xl">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={attraction.thumbnail ?? '/placeholder.jpg'}
                        alt={attractionName}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        loading="lazy"
                      />
                      <Badge className="absolute end-4 top-4 glass font-medium text-foreground">
                        {attractionTypeLabel(attraction.type, language)}
                      </Badge>
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </div>
                    <CardContent className="p-5 sm:p-6">
                      <h3 className="mb-2 text-base font-bold text-foreground transition-colors duration-300 group-hover:text-primary sm:text-lg">
                        {attractionName}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                        {attractionDescription}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-accent">
                          <Star className="h-5 w-5 fill-current" />
                          <span className="text-base font-bold">
                            {formatRating(attraction.ratingAvg)}
                          </span>
                        </div>
                        {attraction.durationHours && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {attraction.durationHours} {copy.hoursSuffix}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </SR>
        )}
      </div>
    </section>
  );
}
