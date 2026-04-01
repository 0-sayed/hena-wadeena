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
import { usePriceIndex, usePriceSummary } from '@/hooks/use-price-index';
import { useBusinesses } from '@/hooks/use-businesses';
import { useCommodities } from '@/hooks/use-commodities';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/hooks/use-auth';
import { businessesAPI } from '@/services/api';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { formatPrice, districtLabel, categoryLabel, unitLabel, DISTRICTS } from '@/lib/format';

type SupplierFormState = {
  nameAr: string;
  category: string;
  district: string;
  phone: string;
  website: string;
  logoUrl: string;
  descriptionAr: string;
  commodityIds: string[];
};

const emptySupplierForm: SupplierFormState = {
  nameAr: '',
  category: '',
  district: 'kharga',
  phone: '',
  website: '',
  logoUrl: '',
  descriptionAr: '',
  commodityIds: [],
};

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
  } = usePriceIndex({ region: selectedCity });

  const {
    data: businesses,
    isLoading: suppliersLoading,
    hasNextPage: suppliersHasNext,
    isFetchingNextPage: suppliersFetchingNext,
    fetchNextPage: suppliersFetchNext,
  } = useBusinesses({ q: debouncedSupplierSearch || undefined });
  const { data: summary } = usePriceSummary();
  const { data: commodities = [], isLoading: commoditiesLoading } = useCommodities();

  const filteredProducts = useMemo(
    () =>
      priceEntries.filter(
        (entry) =>
          entry.commodity.nameAr.includes(priceSearchQuery) ||
          categoryLabel(entry.commodity.category).includes(priceSearchQuery),
      ),
    [priceEntries, priceSearchQuery],
  );

  const handleSupplierFieldChange = (field: keyof SupplierFormState, value: string) => {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
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

    if (!supplierForm.category.trim()) {
      toast.error('فئة المورد مطلوبة');
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
      await businessesAPI.create({
        nameAr: supplierForm.nameAr.trim(),
        category: supplierForm.category.trim(),
        district: supplierForm.district,
        phone: supplierForm.phone.trim() || undefined,
        website: supplierForm.website.trim() || undefined,
        logoUrl: supplierForm.logoUrl.trim() || undefined,
        descriptionAr: supplierForm.descriptionAr.trim() || undefined,
        commodityIds: supplierForm.commodityIds,
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
    <Layout>
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
                      <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن منتج..."
                        value={priceSearchQuery}
                        onChange={(event) => setPriceSearchQuery(event.target.value)}
                        className="h-12 rounded-xl pr-12"
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
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border bg-muted/30">
                                <th className="px-6 py-5 text-right text-sm font-semibold text-muted-foreground">
                                  المنتج
                                </th>
                                <th className="px-6 py-5 text-right text-sm font-semibold text-muted-foreground">
                                  التصنيف
                                </th>
                                <th className="px-6 py-5 text-right text-sm font-semibold text-muted-foreground">
                                  السعر
                                </th>
                                <th className="px-6 py-5 text-right text-sm font-semibold text-muted-foreground">
                                  التغير
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredProducts.map((entry, index) => (
                                <tr
                                  key={`${entry.commodity.id}-${entry.region}-${entry.priceType}`}
                                  className={`transition-colors duration-200 hover:bg-muted/20 ${
                                    index !== filteredProducts.length - 1
                                      ? 'border-b border-border/50'
                                      : ''
                                  }`}
                                >
                                  <td className="px-6 py-5">
                                    <span className="font-semibold text-foreground">
                                      {entry.commodity.nameAr}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5">
                                    <Badge variant="outline">
                                      {categoryLabel(entry.commodity.category)}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-5">
                                    <span className="text-lg font-bold text-foreground">
                                      {formatPrice(entry.latestPrice)}
                                    </span>
                                    <span className="mr-1 text-sm text-muted-foreground">
                                      جنيه/{unitLabel(entry.commodity.unit)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5">
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
                      <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="ابحث عن مورد..."
                        value={supplierSearch}
                        onChange={(event) => setSupplierSearch(event.target.value)}
                        className="h-12 rounded-xl pr-12"
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
                      {businesses.map((biz) => (
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
                                    <Phone className="ml-2 h-4 w-4" />
                                    تواصل
                                  </a>
                                </Button>
                              ) : biz.website ? (
                                <Button
                                  asChild
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                >
                                  <a href={biz.website} target="_blank" rel="noreferrer">
                                    <ExternalLink className="ml-2 h-4 w-4" />
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
                اربط المورد بالمحاصيل نفسها المستخدمة في صفحة المحاصيل ولوحة الأسعار.
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
                <Label htmlFor="supplierCategory">الفئة</Label>
                <Input
                  id="supplierCategory"
                  value={supplierForm.category}
                  onChange={(event) => handleSupplierFieldChange('category', event.target.value)}
                  placeholder="مثل: تمور، خضروات، خدمات زراعية"
                />
              </div>
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
                <Label>المحاصيل المرتبطة</Label>
                {commoditiesLoading && (
                  <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>
                )}
              </div>
              <div className="grid gap-3 rounded-xl border border-border/60 p-4 md:grid-cols-2">
                {commodities.map((commodity) => (
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
