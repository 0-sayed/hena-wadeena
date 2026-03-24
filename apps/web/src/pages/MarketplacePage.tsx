import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, MapPin, Phone, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { PageHero } from '@/components/layout/PageHero';
import heroMarketplace from '@/assets/hero-marketplace.jpg';
import { TrendBadge } from '@/components/market/TrendBadge';
import { usePriceIndex, usePriceSummary } from '@/hooks/use-price-index';
import { useBusinesses } from '@/hooks/use-businesses';
import { formatPrice, districtLabel, categoryLabel, unitLabel, DISTRICTS } from '@/lib/format';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState('kharga');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: pricesData, isLoading: pricesLoading } = usePriceIndex({
    region: selectedCity,
  });
  const { data: suppliersData, isLoading: suppliersLoading } = useBusinesses();
  const { data: summary } = usePriceSummary();

  const priceEntries = pricesData?.data ?? [];
  const businesses = suppliersData?.data ?? [];

  const filteredProducts = priceEntries.filter(
    (e) =>
      e.commodity.nameAr.includes(searchQuery) ||
      categoryLabel(e.commodity.category).includes(searchQuery),
  );

  return (
    <Layout>
      <PageTransition>
        {/* Hero Section */}
        <PageHero image={heroMarketplace} alt="البورصة والأسعار">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <BarChart3 className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">البورصة والأسعار</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              البورصة والأسعار
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-8">
              أسعار المنتجات المحلية، دليل الموردين، والتواصل المباشر
            </p>
          </SR>
        </PageHero>

        {/* Content */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="prices" className="w-full">
              <SR>
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-10 h-12 rounded-xl">
                  <TabsTrigger value="prices" className="rounded-lg text-sm font-semibold">
                    لوحة الأسعار
                  </TabsTrigger>
                  <TabsTrigger value="suppliers" className="rounded-lg text-sm font-semibold">
                    دليل الموردين
                  </TabsTrigger>
                </TabsList>
              </SR>

              {/* Prices Tab */}
              <TabsContent value="prices" className="space-y-6">
                <SR>
                  <div className="flex flex-col md:flex-row gap-4">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="w-full md:w-48 h-12 rounded-xl">
                        <SelectValue placeholder="اختر المدينة" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن منتج..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pr-12 h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </SR>

                <SR delay={150}>
                  <Card className="border-border/50 overflow-hidden rounded-2xl shadow-lg">
                    <div className="bg-primary/5 px-6 py-5 border-b border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground text-lg">
                          أسعار {DISTRICTS.find((c) => c.id === selectedCity)?.name}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          {summary?.lastUpdated
                            ? `آخر تحديث للبورصة: ${new Date(summary.lastUpdated).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                            : 'آخر تحديث: غير متاح'}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-0">
                      {pricesLoading ? (
                        <div className="p-6 space-y-4">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} h="h-12" />
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border bg-muted/30">
                                <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                                  المنتج
                                </th>
                                <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                                  التصنيف
                                </th>
                                <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                                  السعر
                                </th>
                                <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                                  التغير
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((entry, index) => (
                                <tr
                                  key={entry.commodity.id}
                                  className={`hover:bg-muted/20 transition-colors duration-200 ${index !== filteredProducts.length - 1 ? 'border-b border-border/50' : ''}`}
                                >
                                  <td className="py-5 px-6">
                                    <span className="font-semibold text-foreground">
                                      {entry.commodity.nameAr}
                                    </span>
                                  </td>
                                  <td className="py-5 px-6">
                                    <Badge variant="outline">
                                      {categoryLabel(entry.commodity.category)}
                                    </Badge>
                                  </td>
                                  <td className="py-5 px-6">
                                    <span className="font-bold text-lg text-foreground">
                                      {formatPrice(entry.latestPrice)}
                                    </span>
                                    <span className="text-sm text-muted-foreground mr-1">
                                      جنيه/{unitLabel(entry.commodity.unit)}
                                    </span>
                                  </td>
                                  <td className="py-5 px-6">
                                    <TrendBadge changePercent={entry.changePercent} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </SR>
              </TabsContent>

              {/* Suppliers Tab */}
              <TabsContent value="suppliers" className="space-y-6">
                <SR>
                  <div className="relative max-w-md">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="ابحث عن مورد..." className="pr-12 h-12 rounded-xl" />
                  </div>
                </SR>

                {suppliersLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} h="h-56" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                      {businesses.map((biz) => (
                        <Card
                          key={biz.id}
                          className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl"
                        >
                          <CardContent className="p-7">
                            <div className="flex items-start justify-between mb-5">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-bold text-foreground">
                                    {biz.nameAr}
                                  </h3>
                                  {biz.verificationStatus === 'verified' && (
                                    <Badge className="bg-primary/10 text-primary">موثق</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  {districtLabel(biz.district ?? '')}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-5">
                              {biz.commodities.map((c) => (
                                <Badge key={c.id} variant="secondary">
                                  {c.nameAr}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                className="flex-1 hover:scale-[1.02] transition-transform"
                                onClick={() => void navigate(`/marketplace/supplier/${biz.id}`)}
                              >
                                عرض الملف
                              </Button>
                              <Button
                                className="flex-1 hover:scale-[1.02] transition-transform"
                                onClick={() =>
                                  alert(`للتواصل مع ${biz.nameAr}: اتصل أو أرسل واتساب`)
                                }
                              >
                                <Phone className="h-4 w-4 ml-2" />
                                تواصل
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SR>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default MarketplacePage;
