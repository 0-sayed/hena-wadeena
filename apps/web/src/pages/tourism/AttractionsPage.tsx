import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, Star, Clock, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadMoreButton } from '@/components/LoadMoreButton';
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
import { useAttractions } from '@/hooks/use-attractions';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import {
  attractionTypeLabels,
  areaLabels,
  formatRating,
  type AttractionType,
  type AttractionArea,
} from '@/lib/format';
import type { AttractionFilters } from '@/services/api';

const AttractionsPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Omit<AttractionFilters, 'page'>>({ limit: 12 });

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useAttractions(filters);

  const attractions = data?.pages.flatMap((p) => p.data) ?? [];

  const handleTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      type: value === 'all' ? undefined : (value as AttractionType),
    }));
  };

  const handleAreaChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      area: value === 'all' ? undefined : (value as AttractionArea),
    }));
  };

  const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value || undefined;
    setFilters((prev) => ({ ...prev, search }));
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background" />
        <div className="container relative px-4">
          <Button variant="ghost" onClick={() => void navigate('/tourism')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للسياحة
          </Button>

          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              المعالم السياحية
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              استكشف أجمل المعالم الأثرية والطبيعية في الوادي الجديد والواحات المصرية
            </p>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن معلم سياحي..."
                  className="pr-12 h-12"
                  onChange={handleSearchChange}
                />
              </div>
              <Select onValueChange={handleTypeChange} defaultValue="all">
                <SelectTrigger className="h-12 w-40">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {(Object.entries(attractionTypeLabels) as [AttractionType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Select onValueChange={handleAreaChange} defaultValue="all">
                <SelectTrigger className="h-12 w-40">
                  <SelectValue placeholder="المنطقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المناطق</SelectItem>
                  {(Object.entries(areaLabels) as [AttractionArea, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Attractions Grid */}
      <section className="py-12">
        <div className="container px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">عرض {attractions.length} معلم سياحي</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {attractions.map((attraction) => (
                  <Card
                    key={attraction.id}
                    className="group overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => void navigate(`/tourism/attraction/${attraction.slug}`)}
                  >
                    <div className="aspect-[4/3] overflow-hidden relative">
                      <img
                        src={attraction.thumbnail ?? '/placeholder.jpg'}
                        alt={attraction.nameAr}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <Badge className="absolute top-4 right-4 bg-card/90 text-foreground backdrop-blur-sm">
                        {attractionTypeLabels[attraction.type]}
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {attraction.nameAr}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {attraction.descriptionAr}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {areaLabels[attraction.area]}
                        </div>
                        {attraction.durationHours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {attraction.durationHours} ساعة
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-1 text-accent-foreground">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">{formatRating(attraction.ratingAvg)}</span>
                        </div>
                        <Button variant="outline" size="sm">
                          عرض التفاصيل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {attractions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    لم يتم العثور على نتائج مطابقة لبحثك
                  </p>
                </div>
              )}

              <LoadMoreButton
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            </>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AttractionsPage;
