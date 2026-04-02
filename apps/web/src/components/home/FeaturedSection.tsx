import { Link } from 'react-router';
import { ArrowLeft, MapPin, Star, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SR } from '@/components/motion/ScrollReveal';
import { CardGridSkeleton } from '@/components/motion/Skeleton';
import { useAttractions } from '@/hooks/use-attractions';
import { attractionTypeLabels, formatRating } from '@/lib/format';

export function FeaturedSection() {
  const { data: featuredAttractions, isLoading } = useAttractions({ featured: true }, 4);

  return (
    <section className="py-24">
      <div className="container px-4">
        <SR
          direction="up"
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-14"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-5">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-accent">وجهات مميزة</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">وجهات مميزة</h2>
            <p className="text-lg text-muted-foreground">
              اكتشف أجمل المعالم السياحية في الوادي الجديد
            </p>
          </div>
          <Link to="/tourism">
            <Button
              variant="outline"
              className="gap-2 btn-press hover:scale-[1.03] transition-all duration-300"
            >
              عرض الكل
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </SR>

        {isLoading ? (
          <CardGridSkeleton count={3} />
        ) : (
          <SR stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {featuredAttractions.map((attraction) => (
              <Link key={attraction.id} to={`/tourism/attraction/${attraction.slug}`}>
                <Card className="group h-full overflow-hidden border-border/50 hover:border-primary/40 hover-lift rounded-2xl hover:shadow-xl transition-all duration-400">
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={attraction.thumbnail ?? '/placeholder.jpg'}
                      alt={attraction.nameAr}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    <Badge className="absolute top-4 end-4 glass text-foreground font-medium">
                      {attractionTypeLabels[attraction.type]}
                    </Badge>
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                      {attraction.nameAr}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {attraction.descriptionAr}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-accent">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="font-bold text-base">
                          {formatRating(attraction.ratingAvg)}
                        </span>
                      </div>
                      {attraction.durationHours && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{attraction.durationHours} ساعة</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </SR>
        )}
      </div>
    </section>
  );
}
