import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Layout } from '@/components/layout/Layout';
import {
  TrendingUp,
  TrendingDown,
  Search,
  BarChart3,
  ArrowRight,
  Bell,
  BellRing,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePriceAlerts } from '@/hooks/use-price-alerts';
import { PriceAlertSheet } from '@/components/market/PriceAlertSheet';
import { TrendBadge } from '@/components/market/TrendBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router';
import { usePriceIndexPage, usePriceSummary } from '@/hooks/use-price-index';
import {
  formatPrice,
  districtLabel,
  categoryLabel,
  unitLabel,
  DISTRICTS_WITH_ALL,
  CATEGORY_OPTIONS,
} from '@/lib/format';
import { Skeleton, TableRowSkeleton } from '@/components/motion/Skeleton';
import { PriceTrendModal } from '@/components/market/PriceTrendModal';
import type { NvDistrict } from '@hena-wadeena/types';

const PRICE_TABLE_PAGE_SIZE = 20;
type PageToken = number | 'ellipsis-start' | 'ellipsis-end';

function getVisiblePageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return visiblePages.flatMap((page, index) => {
    const previous = visiblePages[index - 1];
    if (previous != null && page - previous > 1) {
      return [
        page - previous === 2
          ? previous + 1
          : (`ellipsis-${page === totalPages ? 'end' : 'start'}` as PageToken),
        page,
      ];
    }
    return [page];
  });
}

const PricesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: priceAlerts = [] } = usePriceAlerts();
  const alertedCommodityIds = useMemo(
    () => new Set(priceAlerts.map((a) => a.commodityId)),
    [priceAlerts],
  );
  const [alertSheetCommodity, setAlertSheetCommodity] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [trendCommodity, setTrendCommodity] = useState<{
    id: string;
    name: string;
    region?: string;
  } | null>(null);

  function handleBellClick(commodityId: string, name: string) {
    if (!isAuthenticated) {
      void navigate('/login');
      return;
    }
    setAlertSheetCommodity({ id: commodityId, name });
  }

  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const regionFilter = selectedCity === 'all' ? undefined : selectedCity;
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [regionFilter, selectedCategory, debouncedSearch]);

  const priceIndex = usePriceIndexPage(
    {
      q: debouncedSearch || undefined,
      category: selectedCategory,
      region: regionFilter,
      price_type: 'retail',
    },
    currentPage,
    PRICE_TABLE_PAGE_SIZE,
  );
  const entries = priceIndex.data?.data ?? [];
  const totalProducts = priceIndex.data?.total ?? 0;
  const isLoading = priceIndex.isLoading;
  const isFetching = priceIndex.isFetching;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRICE_TABLE_PAGE_SIZE));
  const visiblePageTokens = useMemo(
    () => getVisiblePageTokens(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (!isLoading && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, isLoading, totalPages]);

  const { data: summary, isLoading: isSummaryLoading } = usePriceSummary();
  // Top movers: prefer the global market summary. Fall back to the current
  // entries (which carry region info) if the summary bucket is empty, so the
  // UI stays populated while still reflecting the latest page.
  type MoverCard = {
    commodity: { id: string; nameAr: string };
    changePercent: number;
    region?: string;
  };

  const summaryGainers: MoverCard[] = (summary?.topMovers ?? [])
    .filter((m) => m.direction === 'up' && (m.changePercent ?? 0) > 0)
    .slice(0, 5)
    .map((m) => ({ commodity: m.commodity, changePercent: m.changePercent ?? 0 }));
  const summaryLosers: MoverCard[] = (summary?.topMovers ?? [])
    .filter((m) => m.direction === 'down' && (m.changePercent ?? 0) < 0)
    .slice(0, 5)
    .map((m) => ({ commodity: m.commodity, changePercent: m.changePercent ?? 0 }));

  const entryGainers: MoverCard[] = [...entries]
    .filter((e) => (e.changePercent ?? 0) > 0)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
    .slice(0, 5)
    .map((e) => ({
      commodity: { id: e.commodity.id, nameAr: e.commodity.nameAr },
      changePercent: e.changePercent ?? 0,
      region: e.region,
    }));
  const entryLosers: MoverCard[] = [...entries]
    .filter((e) => (e.changePercent ?? 0) < 0)
    .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
    .slice(0, 5)
    .map((e) => ({
      commodity: { id: e.commodity.id, nameAr: e.commodity.nameAr },
      changePercent: e.changePercent ?? 0,
      region: e.region,
    }));

  const gainers = summaryGainers.length > 0 ? summaryGainers : entryGainers;
  const losers = summaryLosers.length > 0 ? summaryLosers : entryLosers;

  const filteredProducts = entries;
  const pageStart = totalProducts === 0 ? 0 : (currentPage - 1) * PRICE_TABLE_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PRICE_TABLE_PAGE_SIZE, totalProducts);

  return (
    <Layout title="أسعار السوق">
      {/* Hero */}
      <section className="bg-gradient-to-bl from-accent/20 via-background to-background py-12 md:py-16">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate('/marketplace')} className="mb-4">
            <ArrowRight className="h-4 w-4" />
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
            <div className="grid grid-cols-1 gap-4 mb-8 max-w-xs">
              <Skeleton h="h-24" className="rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-8 max-w-xs">
              <Card className="border-border/50">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalProducts}</p>
                  <p className="text-sm text-muted-foreground">منتج متاح</p>
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
                  {gainers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      لا توجد منتجات صاعدة حاليا
                    </p>
                  ) : (
                    gainers.map((mover) => (
                      <div
                        key={`${mover.commodity.id}-${mover.region ?? 'all'}-up`}
                        className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/50"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{mover.commodity.nameAr}</span>
                          {mover.region && (
                            <Badge
                              variant="outline"
                              aria-label={`مدينة المنتج الأكثر ارتفاعا ${districtLabel(mover.region)}`}
                              className="shrink-0 text-xs"
                            >
                              {districtLabel(mover.region)}
                            </Badge>
                          )}
                        </div>
                        <Badge className="shrink-0 bg-primary/10 text-primary">
                          +{mover.changePercent}%
                        </Badge>
                      </div>
                    ))
                  )}
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
                  {losers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      لا توجد منتجات هابطة حاليا
                    </p>
                  ) : (
                    losers.map((mover) => (
                      <div
                        key={`${mover.commodity.id}-${mover.region ?? 'all'}-down`}
                        className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/50"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{mover.commodity.nameAr}</span>
                          {mover.region && (
                            <Badge
                              variant="outline"
                              aria-label={`مدينة المنتج الأكثر انخفاضا ${districtLabel(mover.region)}`}
                              className="shrink-0 text-xs"
                            >
                              {districtLabel(mover.region)}
                            </Badge>
                          )}
                        </div>
                        <Badge className="shrink-0 bg-destructive/10 text-destructive">
                          {mover.changePercent}%
                        </Badge>
                      </div>
                    ))
                  )}
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

            <div className="relative flex-1 md:max-w-xs me-auto">
              <Search className="search-inline-icon-md absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-with-icon-md"
              />
            </div>
          </div>

          {/* Price Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table className="min-w-[48rem] table-fixed">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-4">المنتج</TableHead>
                    <TableHead className="px-6 py-4">التصنيف</TableHead>
                    <TableHead className="px-6 py-4">المدينة</TableHead>
                    <TableHead className="px-6 py-4">السعر</TableHead>
                    <TableHead className="px-6 py-4">التغير</TableHead>
                    <TableHead className="w-16 px-6 py-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                    : filteredProducts.map((entry) => (
                        <TableRow
                          key={`${entry.commodity.id}-${entry.region}`}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() =>
                            setTrendCommodity({
                              id: entry.commodity.id,
                              name: entry.commodity.nameAr,
                              region: entry.region,
                            })
                          }
                        >
                          <TableCell className="px-6 py-4 text-start">
                            <span className="font-medium text-foreground">
                              {entry.commodity.nameAr}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-start">
                            <Badge variant="outline">
                              {categoryLabel(entry.commodity.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-start text-muted-foreground">
                            {districtLabel(entry.region)}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-start">
                            <div className="flex flex-wrap items-baseline gap-1">
                              <span className="font-semibold text-foreground">
                                {formatPrice(entry.latestPrice)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                جنيه/{unitLabel(entry.commodity.unit)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-start">
                            <TrendBadge changePercent={entry.changePercent} size="sm" showSign />
                          </TableCell>
                          <TableCell className="py-4 pe-8 ps-4 text-start">
                            <button
                              type="button"
                              aria-label={`تنبيه سعر ${entry.commodity.nameAr}`}
                              className="p-1 rounded hover:bg-muted transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBellClick(entry.commodity.id, entry.commodity.nameAr);
                              }}
                            >
                              {alertedCommodityIds.has(entry.commodity.id) ? (
                                <BellRing className="h-4 w-4 text-primary" />
                              ) : (
                                <Bell className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalProducts > PRICE_TABLE_PAGE_SIZE && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 md:flex-row">
              <p className="text-sm text-muted-foreground">
                عرض {pageStart}-{pageEnd} من {totalProducts} منتج
              </p>
              <nav
                aria-label="ترقيم صفحات جدول الأسعار"
                className="flex flex-wrap items-center justify-center gap-2"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1 || isFetching}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  السابق
                </Button>
                {visiblePageTokens.map((token) =>
                  typeof token === 'number' ? (
                    <Button
                      key={token}
                      type="button"
                      variant={token === currentPage ? 'default' : 'outline'}
                      size="sm"
                      aria-label={`صفحة ${token}`}
                      aria-current={token === currentPage ? 'page' : undefined}
                      disabled={isFetching}
                      onClick={() => setCurrentPage(token)}
                    >
                      {token}
                    </Button>
                  ) : (
                    <span
                      key={token}
                      aria-hidden="true"
                      className="px-2 text-sm text-muted-foreground"
                    >
                      ...
                    </span>
                  ),
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isFetching}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  التالي
                </Button>
              </nav>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-4">
            {summary?.lastUpdated
              ? `آخر تحديث: ${new Date(summary.lastUpdated).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : 'لا تتوفر بيانات حاليا'}
          </p>
        </div>
      </section>

      {alertSheetCommodity && (
        <PriceAlertSheet
          commodityId={alertSheetCommodity.id}
          commodityName={alertSheetCommodity.name}
          open={!!alertSheetCommodity}
          onOpenChange={(open) => !open && setAlertSheetCommodity(null)}
        />
      )}
      <PriceTrendModal
        commodity={trendCommodity}
        onClose={() => setTrendCommodity(null)}
        region={trendCommodity?.region as NvDistrict | undefined}
      />
    </Layout>
  );
};

export default PricesPage;
