import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, MapPin, Phone, BarChart3, Plus, ExternalLink, Building2 } from 'lucide-react';
import { UserRole } from '@hena-wadeena/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePriceIndex, usePriceSummary } from '@/hooks/use-price-index';
import { useBusinesses } from '@/hooks/use-businesses';
import { useCommodities } from '@/hooks/use-commodities';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/hooks/use-auth';
import { businessesAPI } from '@/services/api';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { formatPrice, districtLabel, categoryLabel, unitLabel, DISTRICTS } from '@/lib/format';
import { matchesSearchQuery } from '@/lib/search';

type SupplierFormState = {
  nameAr: string;
  district: string;
  phone: string;
  website: string;
  logoUrl: string;
  descriptionAr: string;
  primaryCommodityId: string;
  customCommodityName: string;
  commodityIds: string[];
};

const emptySupplierForm: SupplierFormState = {
  nameAr: '',
  district: 'kharga',
  phone: '',
  website: '',
  logoUrl: '',
  descriptionAr: '',
  primaryCommodityId: '',
  customCommodityName: '',
  commodityIds: [],
};

const OTHER_COMMODITY_VALUE = '__other__';

function isValidAbsoluteHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidLogoUrl(value: string) {
  return (
    value.startsWith('/') ||
    value.startsWith('data:image/') ||
    isValidAbsoluteHttpUrl(value)
  );
}

const MarketplacePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageSuppliers = user?.role === UserRole.ADMIN;
  const [selectedCity, setSelectedCity] = useState('kharga');
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);

  const {
    data: priceEntries,
    isLoading: pricesLoading,
    hasNextPage: pricesHasNext,
    isFetchingNextPage: pricesFetchingNext,
    fetchNextPage: pricesFetchNext,
  } = usePriceIndex({ region: selectedCity, price_type: 'retail' });

  const {
    data: businesses,
    isLoading: suppliersLoading,
    hasNextPage: suppliersHasNext,
    isFetchingNextPage: suppliersFetchingNext,
    fetchNextPage: suppliersFetchNext,
  } = useBusinesses({ q: debouncedSupplierSearch || undefined });
  const { data: summary } = usePriceSummary();
  const { data: commodities = [], isLoading: commoditiesLoading } = useCommodities();
  const selectedPrimaryCommodity = useMemo(
    () => commodities.find((commodity) => commodity.id === supplierForm.primaryCommodityId),
    [commodities, supplierForm.primaryCommodityId],
  );
  const additionalCommodityOptions = useMemo(
    () =>
      commodities.filter((commodity) => commodity.id !== supplierForm.primaryCommodityId),
    [commodities, supplierForm.primaryCommodityId],
  );

  const filteredProducts = useMemo(
    () =>
      priceEntries.filter(
        (entry) =>
          entry.commodity.nameAr.includes(priceSearchQuery) ||
          categoryLabel(entry.commodity.category).includes(priceSearchQuery),
      ),
    [priceEntries, priceSearchQuery],
  );

  const filteredBusinesses = useMemo(
    () =>
      businesses.filter((biz) =>
        matchesSearchQuery(supplierSearch, [
          biz.nameAr,
          biz.nameEn,
          biz.category,
          biz.descriptionAr,
          biz.description,
          districtLabel(biz.district ?? ''),
          ...(biz.commodities.flatMap((commodity) => [
            commodity.nameAr,
            commodity.nameEn,
            commodity.category,
          ]) as string[]),
        ]),
      ),
    [businesses, supplierSearch],
  );

  const handleSupplierFieldChange = (field: keyof SupplierFormState, value: string) => {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrimaryCommodityChange = (value: string) => {
    setSupplierForm((prev) => ({
      ...prev,
      primaryCommodityId: value,
      customCommodityName: value === OTHER_COMMODITY_VALUE ? prev.customCommodityName : '',
      commodityIds:
        value === OTHER_COMMODITY_VALUE
          ? prev.commodityIds
          : prev.commodityIds.filter((commodityId) => commodityId !== value),
    }));
  };

  const toggleCommodity = (commodityId: string, checked: boolean) => {
    setSupplierForm((prev) => ({
      ...prev,
      commodityIds: checked
        ? [...prev.commodityIds, commodityId]
        : prev.commodityIds.filter((id) => id !== commodityId),
    }));
  };

  const resetSupplierDialog = () => {
    setSupplierForm(emptySupplierForm);
    setSupplierDialogOpen(false);
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.nameAr.trim()) {
      toast.error('اسم المورد مطلوب');
      return;
    }

    if (!supplierForm.primaryCommodityId) {
      toast.error('اختر المحصول الرئيسي');
      return;
    }

    const resolvedCropName =
      supplierForm.primaryCommodityId === OTHER_COMMODITY_VALUE
        ? supplierForm.customCommodityName.trim()
        : selectedPrimaryCommodity?.nameAr.trim() ?? '';

    if (!resolvedCropName) {
      toast.error('أدخل اسم المحصول المخصص');
      return;
    }

    if (!supplierForm.district) {
      toast.error('اختر المنطقة');
      return;
    }

    if (supplierForm.website.trim() && !/^https?:\/\//i.test(supplierForm.website.trim())) {
      toast.error('رابط الموقع يجب أن يبدأ بـ http:// أو https://');
      return;
    }

    if (supplierForm.logoUrl.trim() && !isValidLogoUrl(supplierForm.logoUrl.trim())) {
      toast.error('رابط الشعار يجب أن يكون مساراً نسبياً أو رابط http(s) أو data URL');
      return;
    }

    setIsSavingSupplier(true);
    try {
      const linkedCommodityIds =
        supplierForm.primaryCommodityId === OTHER_COMMODITY_VALUE
          ? supplierForm.commodityIds
          : Array.from(
              new Set([supplierForm.primaryCommodityId, ...supplierForm.commodityIds]),
            );

      await businessesAPI.create({
        nameAr: supplierForm.nameAr.trim(),
        category: resolvedCropName,
        district: supplierForm.district,
        phone: supplierForm.phone.trim() || undefined,
        website: supplierForm.website.trim() || undefined,
        logoUrl: supplierForm.logoUrl.trim() || undefined,
        descriptionAr: supplierForm.descriptionAr.trim() || undefined,
        commodityIds: linkedCommodityIds.length > 0 ? linkedCommodityIds : undefined,
      });

      void queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });
      resetSupplierDialog();
      toast.success('تمت إضافة المورد وظهر مباشرة في الدليل');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إضافة المورد';
      toast.error(message);
    } finally {
      setIsSavingSupplier(false);
    }
  };

  return (
    <Layout title="البورصة والأسعار">
      <PageTransition>
        <PageHero image={heroMarketplace} alt="البورصة والأسعار">
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">البورصة والأسعار</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              البورصة والأسعار
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-8 text-lg text-card/90 md:text-xl">
              أسعار المنتجات المحلية، دليل الموردين، والتواصل المباشر
            </p>
          </SR>
        </PageHero>

        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="prices" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-10 grid h-12 w-full max-w-md grid-cols-2 rounded-xl">
                  <TabsTrigger value="prices" className="rounded-lg text-sm font-semibold">
                    لوحة الأسعار
                  </TabsTrigger>
                  <TabsTrigger value="suppliers" className="rounded-lg text-sm font-semibold">
                    دليل الموردين
                  </TabsTrigger>
                </TabsList>
              </SR>

              <TabsContent value="prices" className="space-y-6">
                <SR>
                  <div className="flex flex-col gap-4 md:flex-row">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-12 w-full rounded-xl md:w-48">
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
                      <Search className="search-inline-icon-lg absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن منتج..."
                        value={priceSearchQuery}
                        onChange={(event) => setPriceSearchQuery(event.target.value)}
                        className="search-input-with-icon-md h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </SR>

                <SR delay={150}>
                  <Card className="overflow-hidden rounded-2xl border-border/50 shadow-lg">
                    <div className="border-b border-border bg-primary/5 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground">
                          أسعار {DISTRICTS.find((city) => city.id === selectedCity)?.name}
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
                        <div className="space-y-4 p-6">
                          {[1, 2, 3, 4, 5].map((item) => (
                            <Skeleton key={item} h="h-12" />
                          ))}
                        </div>
                      ) : (
                        <Table className="table-fixed">
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="px-6 py-5">المنتج</TableHead>
                              <TableHead className="px-6 py-5">التصنيف</TableHead>
                              <TableHead className="px-6 py-5">السعر</TableHead>
                              <TableHead className="px-6 py-5">التغير</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProducts.map((entry) => (
                              <TableRow
                                key={`${entry.commodity.id}-${entry.region}-${entry.priceType}`}
                                className="transition-colors duration-200 hover:bg-muted/20"
                              >
                                <TableCell className="px-6 py-5 text-start">
                                  <span className="font-semibold text-foreground">
                                    {entry.commodity.nameAr}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-5 text-start">
                                  <Badge variant="outline">
                                    {categoryLabel(entry.commodity.category)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-6 py-5 text-start">
                                  <div className="flex flex-wrap items-baseline gap-1">
                                    <span className="text-lg font-bold text-foreground">
                                      {formatPrice(entry.latestPrice)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      جنيه/{unitLabel(entry.commodity.unit)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-5 text-start">
                                  <TrendBadge changePercent={entry.changePercent} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </SR>
                <LoadMoreButton
                  hasNextPage={pricesHasNext}
                  isFetchingNextPage={pricesFetchingNext}
                  fetchNextPage={pricesFetchNext}
                />
              </TabsContent>

              <TabsContent value="suppliers" className="space-y-6">
                <SR>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative max-w-md flex-1">
                      <Search className="search-inline-icon-lg absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن مورد..."
                        value={supplierSearch}
                        onChange={(event) => setSupplierSearch(event.target.value)}
                        className="search-input-with-icon-md h-12 rounded-xl"
                      />
                    </div>
                    {canManageSuppliers && (
                      <Button className="gap-2" onClick={() => setSupplierDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        إضافة مورد
                      </Button>
                    )}
                  </div>
                </SR>

                {suppliersLoading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                      <Skeleton key={item} h="h-56" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                      {filteredBusinesses.map((biz) => (
                        <Card
                          key={biz.id}
                          className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                        >
                          <CardContent className="p-7">
                            <div className="mb-5 flex items-start gap-4">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
                                {biz.logoUrl ? (
                                  <img
                                    src={biz.logoUrl}
                                    alt={biz.nameAr}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Building2 className="h-7 w-7 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <h3 className="truncate text-lg font-bold text-foreground">
                                    {biz.nameAr}
                                  </h3>
                                  {biz.verificationStatus === 'verified' && (
                                    <Badge className="bg-primary/10 text-primary">موثق</Badge>
                                  )}
                                </div>
                                <p className="mb-2 text-sm text-muted-foreground">{biz.category}</p>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  {districtLabel(biz.district ?? '')}
                                </div>
                              </div>
                            </div>
                            <div className="mb-4 flex flex-wrap gap-1.5">
                              {biz.commodities.map((commodity) => (
                                <Badge key={commodity.id} variant="secondary">
                                  {commodity.nameAr}
                                </Badge>
                              ))}
                            </div>
                            {biz.descriptionAr && (
                              <p className="mb-5 line-clamp-3 text-sm text-muted-foreground">
                                {biz.descriptionAr}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3">
                              <Button
                                variant="outline"
                                className="flex-1 transition-transform hover:scale-[1.02]"
                                onClick={() => void navigate(`/marketplace/supplier/${biz.id}`)}
                              >
                                عرض الملف
                              </Button>
                              {biz.phone ? (
                                <Button
                                  asChild
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                >
                                  <a href={`tel:${biz.phone}`}>
                                    <Phone className="ms-2 h-4 w-4" />
                                    تواصل
                                  </a>
                                </Button>
                              ) : biz.website ? (
                                <Button
                                  asChild
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                >
                                  <a href={biz.website} target="_blank" rel="noreferrer">
                                    <ExternalLink className="ms-2 h-4 w-4" />
                                    زيارة الموقع
                                  </a>
                                </Button>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SR>
                )}
                {!suppliersLoading && filteredBusinesses.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-lg text-muted-foreground">لا يوجد موردون مطابقون للبحث</p>
                  </div>
                )}
                <LoadMoreButton
                  hasNextPage={suppliersHasNext}
                  isFetchingNextPage={suppliersFetchingNext}
                  fetchNextPage={suppliersFetchNext}
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة مورد جديد</DialogTitle>
              <DialogDescription>
                اختر المحصول الرئيسي من القائمة، أو استخدم "أخرى" لإدخال محصول غير موجود.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierName">اسم المورد</Label>
                <Input
                  id="supplierName"
                  value={supplierForm.nameAr}
                  onChange={(event) => handleSupplierFieldChange('nameAr', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>المحصول الرئيسي</Label>
                <Select
                  value={supplierForm.primaryCommodityId}
                  onValueChange={handlePrimaryCommodityChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحصول الرئيسي" />
                  </SelectTrigger>
                  <SelectContent>
                    {commodities.map((commodity) => (
                      <SelectItem key={commodity.id} value={commodity.id}>
                        {commodity.nameAr}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_COMMODITY_VALUE}>أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {supplierForm.primaryCommodityId === OTHER_COMMODITY_VALUE && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplierCustomCommodity">حدد المحصول</Label>
                  <Input
                    id="supplierCustomCommodity"
                    value={supplierForm.customCommodityName}
                    onChange={(event) =>
                      handleSupplierFieldChange('customCommodityName', event.target.value)
                    }
                    placeholder="اكتب اسم المحصول"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>المنطقة</Label>
                <Select
                  value={supplierForm.district}
                  onValueChange={(value) => handleSupplierFieldChange('district', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierPhone">رقم التواصل</Label>
                <Input
                  id="supplierPhone"
                  value={supplierForm.phone}
                  onChange={(event) => handleSupplierFieldChange('phone', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierWebsite">رابط الموقع</Label>
                <Input
                  id="supplierWebsite"
                  value={supplierForm.website}
                  onChange={(event) => handleSupplierFieldChange('website', event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierLogo">رابط الشعار</Label>
                <Input
                  id="supplierLogo"
                  value={supplierForm.logoUrl}
                  onChange={(event) => handleSupplierFieldChange('logoUrl', event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierDescription">الوصف</Label>
              <Textarea
                id="supplierDescription"
                rows={4}
                value={supplierForm.descriptionAr}
                onChange={(event) => handleSupplierFieldChange('descriptionAr', event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>محاصيل مرتبطة إضافية (اختياري)</Label>
                {commoditiesLoading && (
                  <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>
                )}
              </div>
              <div className="grid gap-3 rounded-xl border border-border/60 p-4 md:grid-cols-2">
                {additionalCommodityOptions.map((commodity) => (
                  <label
                    key={commodity.id}
                    className="flex items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={supplierForm.commodityIds.includes(commodity.id)}
                      onCheckedChange={(checked) => toggleCommodity(commodity.id, checked === true)}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{commodity.nameAr}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(commodity.category)} · {unitLabel(commodity.unit)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetSupplierDialog} disabled={isSavingSupplier}>
                إلغاء
              </Button>
              <Button onClick={() => void handleCreateSupplier()} disabled={isSavingSupplier}>
                {isSavingSupplier ? 'جارٍ الحفظ...' : 'حفظ المورد'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </Layout>
  );
};

export default MarketplacePage;
