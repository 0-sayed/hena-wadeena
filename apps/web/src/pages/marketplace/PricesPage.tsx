import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TrendingUp, TrendingDown, Minus, Search, BarChart3, ArrowRight } from 'lucide-react';
import { TrendBadge } from '@/components/market/TrendBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router';
import { usePriceIndex, usePriceSummary } from '@/hooks/use-price-index';
import {
  formatPrice,
  districtLabel,
  categoryLabel,
  unitLabel,
  DISTRICTS_WITH_ALL,
  CATEGORY_OPTIONS,
} from '@/lib/format';
import { Skeleton, TableRowSkeleton } from '@/components/motion/Skeleton';

const PricesPage = () => {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const regionFilter = selectedCity === 'all' ? undefined : selectedCity;

  const { data: indexData, isLoading } = usePriceIndex({
    category: selectedCategory,
    region: regionFilter,
    limit: 100,
  });
  const { data: summary, isLoading: isSummaryLoading } = usePriceSummary();

  const entries = indexData?.data ?? [];
  const topMovers = summary?.topMovers ?? [];
  const gainers = topMovers.filter((m) => m.direction === 'up');
  const losers = topMovers.filter((m) => m.direction === 'down');

  const filteredProducts = entries.filter(
    (e) =>
      e.commodity.nameAr.includes(searchQuery) ||
      categoryLabel(e.commodity.category).includes(searchQuery),
  );

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-bl from-accent/20 via-background to-background py-12 md:py-16">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-4">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للبورصة
          </Button>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              لوحة الأسعار المباشرة
            </h1>
            <p className="text-lg text-muted-foreground">
              تابع أسعار المنتجات الزراعية في الوادي الجديد لحظة بلحظة
            </p>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container px-4">
          {/* Quick Stats */}
          {isLoading || isSummaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} h="h-24" className="rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{summary?.totalCommodities ?? 0}</p>
                  <p className="text-sm text-muted-foreground">منتج متاح</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{gainers.length}</p>
                  <p className="text-sm text-muted-foreground">منتج صاعد</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <TrendingDown className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-2xl font-bold">{losers.length}</p>
                  <p className="text-sm text-muted-foreground">منتج هابط</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <Minus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {entries.filter((e) => (e.changePercent ?? 0) === 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">منتج مستقر</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-border/50 border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  الأكثر ارتفاعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gainers.map((mover) => (
                    <div
                      key={mover.commodity.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="font-medium">{mover.commodity.nameAr}</span>
                      <Badge className="bg-primary/10 text-primary">
                        +{mover.changePercent ?? 0}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 border-t-4 border-t-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  الأكثر انخفاضاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {losers.map((mover) => (
                    <div
                      key={mover.commodity.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="font-medium">{mover.commodity.nameAr}</span>
                      <Badge className="bg-destructive/10 text-destructive">
                        {mover.changePercent ?? 0}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="اختر المدينة" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICTS_WITH_ALL.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-wrap">
              {CATEGORY_OPTIONS.map((opt) => (
                <Button
                  key={opt.id ?? 'all'}
                  variant={selectedCategory === opt.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(opt.id)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="relative flex-1 md:max-w-xs mr-auto">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Price Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        المنتج
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        التصنيف
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        المدينة
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        السعر
                      </th>
                      <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">
                        التغير
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <TableRowSkeleton key={i} cols={5} />
                        ))
                      : filteredProducts.map((entry, index) => (
                          <tr
                            key={entry.commodity.id}
                            className={`hover:bg-muted/30 ${index !== filteredProducts.length - 1 ? 'border-b border-border/50' : ''}`}
                          >
                            <td className="py-4 px-6">
                              <span className="font-medium text-foreground">
                                {entry.commodity.nameAr}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <Badge variant="outline">
                                {categoryLabel(entry.commodity.category)}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-muted-foreground">
                              {districtLabel(entry.region)}
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-semibold text-foreground">
                                {formatPrice(entry.latestPrice)}
                              </span>
                              <span className="text-sm text-muted-foreground mr-1">
                                جنيه/{unitLabel(entry.commodity.unit)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <TrendBadge changePercent={entry.changePercent} size="sm" showSign />
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {summary?.lastUpdated
              ? `آخر تحديث: ${new Date(summary.lastUpdated).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'لا تتوفر بيانات حاليا'}
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default PricesPage;
