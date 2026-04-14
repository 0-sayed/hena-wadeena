import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDebounce } from '@/hooks/use-debounce';
import { ArrowRight, Leaf, MapPin, Search, Plus, Phone } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/motion/Skeleton';
import { ProduceListingSheet } from '@/components/market/ProduceListingSheet';
import { useListings } from '@/hooks/use-listings';
import { useAuth } from '@/hooks/use-auth';
import {
  districtLabel,
  DISTRICTS_WITH_ALL,
  formatPrice,
  producePriceUnitLabel,
  PRODUCE_COMMODITY_TYPE_OPTIONS,
  produceCommodityTypeLabel,
} from '@/lib/format';

const ProducePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [commodityType, setCommodityType] = useState<string>('all');
  const [district, setDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  const { data, isLoading, isError, refetch } = useListings({
    category: 'agricultural_produce',
    commodity_type: commodityType === 'all' ? undefined : commodityType,
    district: district === 'all' ? undefined : district,
    q: debouncedSearch || undefined,
    limit: 48,
  });

  const listings = data?.data ?? [];

  return (
    <Layout title="منتجات زراعية">
      <section className="bg-gradient-to-bl from-primary/10 via-accent/5 to-background py-12 md:py-16">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-4">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            العودة للبورصة
          </Button>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary mb-4">
              <Leaf className="h-4 w-4" />
              منتجات زراعية
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              تصفح المنتجات الزراعية
            </h1>
            <p className="text-lg text-muted-foreground">
              اعثر على التمور والزيتون والقمح وغيرها من منتجات الوادي الجديد بأفضل الأسعار.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container px-4 space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex gap-2 flex-wrap">
              {PRODUCE_COMMODITY_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={commodityType === opt.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommodityType(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="المنطقة" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICTS_WITH_ALL.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 md:max-w-xs">
              <Search className="search-inline-icon-md absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث عن منتج..."
                className="search-input-with-icon-md"
              />
            </div>

            {isAuthenticated && (
              <Button onClick={() => setIsSheetOpen(true)} className="md:me-auto gap-2">
                <Plus className="h-4 w-4" />
                نشر عرض زراعي
              </Button>
            )}
          </div>

          {/* Listings Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} h="h-72" className="rounded-2xl" />
              ))}
            </div>
          ) : isError ? (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center space-y-4">
                <p className="text-muted-foreground">تعذر تحميل المنتجات الزراعية حالياً.</p>
                <Button variant="outline" onClick={() => void refetch()}>
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          ) : listings.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center space-y-3">
                <Leaf className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">
                  لا توجد منتجات زراعية مطابقة لبحثك حالياً.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift cursor-pointer"
                  onClick={() => void navigate(`/marketplace/ads/${listing.id}`)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={listing.images?.[0] ?? '/placeholder.jpg'}
                      alt={listing.titleAr}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-foreground truncate">
                          {listing.titleAr}
                        </h2>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">
                            {districtLabel(listing.district ?? 'غير محدد')}
                          </span>
                        </div>
                      </div>
                      {listing.produceDetails?.commodityType && (
                        <Badge variant="secondary">
                          {produceCommodityTypeLabel(listing.produceDetails.commodityType)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-1 text-lg font-semibold text-primary">
                        <span>{formatPrice(listing.price)}</span>
                        <span className="text-sm font-normal text-muted-foreground">جنيه</span>
                        <span className="text-sm font-normal text-muted-foreground">/</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {producePriceUnitLabel(listing.priceUnit)}
                        </span>
                      </div>
                      {listing.produceDetails?.quantityKg && (
                        <span className="text-sm text-muted-foreground">
                          {Number(listing.produceDetails.quantityKg).toLocaleString('ar-EG')} كجم
                        </span>
                      )}
                    </div>

                    {listing.produceDetails?.contactPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span dir="ltr">{listing.produceDetails.contactPhone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <ProduceListingSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </Layout>
  );
};

export default ProducePage;
