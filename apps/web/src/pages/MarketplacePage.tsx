import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import {
  Search,
  MapPin,
  Phone,
  BarChart3,
  Plus,
  ExternalLink,
  Building2,
  Leaf,
  TrendingUp,
} from 'lucide-react';
import { UserRole } from '@hena-wadeena/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { BusinessLogo } from '@/components/business/BusinessLogo';
import { TrendBadge } from '@/components/market/TrendBadge';
import { usePriceIndex, usePriceSummary } from '@/hooks/use-price-index';
import { useBusinesses } from '@/hooks/use-businesses';
import { useCommodities } from '@/hooks/use-commodities';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/hooks/use-auth';
import { businessesAPI } from '@/services/api';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { pickLocalizedCopy, pickLocalizedField } from '@/lib/localization';
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
  return value.startsWith('/') || value.startsWith('data:image/') || isValidAbsoluteHttpUrl(value);
}

const MarketplacePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
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
  const selectedPrimaryCommodity = useMemo(
    () => commodities.find((commodity) => commodity.id === supplierForm.primaryCommodityId),
    [commodities, supplierForm.primaryCommodityId],
  );
  const additionalCommodityOptions = useMemo(
    () => commodities.filter((commodity) => commodity.id !== supplierForm.primaryCommodityId),
    [commodities, supplierForm.primaryCommodityId],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = priceSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return priceEntries;

    return priceEntries.filter((entry) => {
      const commodityName = pickLocalizedField(language, {
        ar: entry.commodity.nameAr,
        en: entry.commodity.nameEn,
      }).toLowerCase();
      const commodityCategory = categoryLabel(entry.commodity.category, language).toLowerCase();

      return commodityName.includes(normalizedQuery) || commodityCategory.includes(normalizedQuery);
    });
  }, [language, priceEntries, priceSearchQuery]);

  const localizedDistricts = useMemo(
    () =>
      DISTRICTS.map((district) => ({
        ...district,
        label: districtLabel(district.id, language),
      })),
    [language],
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
      toast.error(
        pickLocalizedCopy(language, {
          ar: 'اسم المورد مطلوب',
          en: 'Supplier name is required',
        }),
      );
      return;
    }

    if (!supplierForm.primaryCommodityId) {
      toast.error(
        pickLocalizedCopy(language, {
          ar: 'اختر المحصول الرئيسي',
          en: 'Choose the primary commodity',
        }),
      );
      return;
    }

    const resolvedCropName =
      supplierForm.primaryCommodityId === OTHER_COMMODITY_VALUE
        ? supplierForm.customCommodityName.trim()
        : (selectedPrimaryCommodity?.nameAr.trim() ?? '');

    if (!resolvedCropName) {
      toast.error(
        pickLocalizedCopy(language, {
          ar: 'أدخل اسم المحصول المخصص',
          en: 'Enter the custom commodity name',
        }),
      );
      return;
    }

    if (!supplierForm.district) {
      toast.error(
        pickLocalizedCopy(language, {
          ar: 'اختر المنطقة',
          en: 'Choose the district',
        }),
      );
      return;
    }

    if (supplierForm.website.trim() && !/^https?:\/\//i.test(supplierForm.website.trim())) {
      toast.error(
        pickLocalizedCopy(language, {
          ar: 'رابط الموقع يجب أن يبدأ بـ http:// أو https://',
          en: 'Website URL must start with http:// or https://',
        }),
      );
      return;
    }

    if (supplierForm.logoUrl.trim() && !isValidLogoUrl(supplierForm.logoUrl.trim())) {
      toast.error(
        pickLocalizedCopy(language, {
          ar: 'رابط الشعار يجب أن يكون مساراً نسبياً أو رابط http(s) أو data URL',
          en: 'Logo URL must be a relative path, an http(s) URL, or a data URL',
        }),
      );
      return;
    }

    setIsSavingSupplier(true);
    try {
      const linkedCommodityIds =
        supplierForm.primaryCommodityId === OTHER_COMMODITY_VALUE
          ? supplierForm.commodityIds
          : Array.from(new Set([supplierForm.primaryCommodityId, ...supplierForm.commodityIds]));

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
      toast.success(
        pickLocalizedCopy(language, {
          ar: 'تمت إضافة المورد وظهر مباشرة في الدليل',
          en: 'Supplier added and published in the directory',
        }),
      );
    } catch (error) {
      const fallbackMessage = pickLocalizedCopy(language, {
        ar: 'تعذر إضافة المورد',
        en: 'Unable to add the supplier',
      });
      const message = error instanceof Error ? error.message : fallbackMessage;
      toast.error(message);
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const lastUpdatedLabel = summary?.lastUpdated
    ? pickLocalizedCopy(language, {
        ar: `آخر تحديث للبورصة: ${new Date(summary.lastUpdated).toLocaleString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        en: `Last market update: ${new Date(summary.lastUpdated).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      })
    : pickLocalizedCopy(language, {
        ar: 'آخر تحديث: غير متاح',
        en: 'Last update: unavailable',
      });

  return (
    <Layout title={pickLocalizedCopy(language, { ar: 'البورصة', en: 'Marketplace' })}>
      <PageTransition>
        <PageHero
          image={heroMarketplace}
          alt={pickLocalizedCopy(language, {
            ar: 'البورصة والأسعار',
            en: 'Marketplace and prices',
          })}
        >
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">
                {pickLocalizedCopy(language, {
                  ar: 'البورصة والأسعار',
                  en: 'Marketplace & prices',
                })}
              </span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              {pickLocalizedCopy(language, {
                ar: 'البورصة والأسعار',
                en: 'Marketplace & prices',
              })}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-8 text-lg text-card/90 md:text-xl">
              {pickLocalizedCopy(language, {
                ar: 'أسعار المنتجات المحلية، دليل الموردين، والتواصل المباشر',
                en: 'Local product prices, supplier directory, and direct contact',
              })}
            </p>
          </SR>
        </PageHero>

        {/* Quick Access Cards */}
        <section className="py-8 bg-muted/20">
          <div className="container px-4">
            <SR>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="rounded-2xl border-border/50 transition-all hover:border-primary/40 hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => void navigate('/marketplace/prices')}
                    className="w-full cursor-pointer text-start"
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {pickLocalizedCopy(language, {
                            ar: 'لوحة الأسعار المباشرة',
                            en: 'Live Price Board',
                          })}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {pickLocalizedCopy(language, {
                            ar: 'تابع أسعار السوق لحظة بلحظة',
                            en: 'Track market prices in real-time',
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </button>
                </Card>

                <Card className="rounded-2xl border-border/50 transition-all hover:border-primary/40 hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => void navigate('/marketplace/produce')}
                    className="w-full cursor-pointer text-start"
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <Leaf className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {pickLocalizedCopy(language, {
                            ar: 'منتجات زراعية',
                            en: 'Agricultural Produce',
                          })}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {pickLocalizedCopy(language, {
                            ar: 'تمور، زيتون، قمح وأكثر',
                            en: 'Dates, olives, wheat and more',
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </button>
                </Card>
              </div>
            </SR>
          </div>
        </section>

        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="prices" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-md grid-cols-2 rounded-2xl p-1 sm:mb-10 sm:h-12 sm:rounded-xl">
                  <TabsTrigger
                    value="prices"
                    className="min-h-[44px] rounded-xl text-sm font-semibold"
                  >
                    {pickLocalizedCopy(language, {
                      ar: 'لوحة الأسعار',
                      en: 'Price board',
                    })}
                  </TabsTrigger>
                  <TabsTrigger
                    value="suppliers"
                    className="min-h-[44px] rounded-xl text-sm font-semibold"
                  >
                    {pickLocalizedCopy(language, {
                      ar: 'دليل الموردين',
                      en: 'Supplier directory',
                    })}
                  </TabsTrigger>
                </TabsList>
              </SR>

              <TabsContent value="prices" className="space-y-6">
                <SR>
                  <div className="flex flex-col gap-4 md:flex-row">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className="h-12 w-full rounded-xl md:w-48">
                        <SelectValue
                          placeholder={pickLocalizedCopy(language, {
                            ar: 'اختر المدينة',
                            en: 'Select city',
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {localizedDistricts.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="search-inline-icon-lg absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={pickLocalizedCopy(language, {
                          ar: 'ابحث عن منتج...',
                          en: 'Search for a product...',
                        })}
                        value={priceSearchQuery}
                        onChange={(event) => setPriceSearchQuery(event.target.value)}
                        className="search-input-with-icon-lg h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </SR>

                <SR delay={150}>
                  <Card className="overflow-hidden rounded-2xl border-border/50 shadow-lg">
                    <div className="border-b border-border bg-primary/5 px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold text-foreground">
                          {pickLocalizedCopy(language, {
                            ar: `أسعار ${districtLabel(selectedCity, language)}`,
                            en: `Prices in ${districtLabel(selectedCity, language)}`,
                          })}
                        </h3>
                        <span className="text-sm text-muted-foreground">{lastUpdatedLabel}</span>
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
                        <Table className="min-w-[52rem] sm:min-w-0">
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="px-4 py-4 sm:px-6 sm:py-5">
                                {pickLocalizedCopy(language, { ar: 'المنتج', en: 'Product' })}
                              </TableHead>
                              <TableHead className="px-4 py-4 sm:px-6 sm:py-5">
                                {pickLocalizedCopy(language, {
                                  ar: 'التصنيف',
                                  en: 'Category',
                                })}
                              </TableHead>
                              <TableHead className="px-4 py-4 sm:px-6 sm:py-5">
                                {pickLocalizedCopy(language, { ar: 'السعر', en: 'Price' })}
                              </TableHead>
                              <TableHead className="px-4 py-4 sm:px-6 sm:py-5">
                                {pickLocalizedCopy(language, { ar: 'التغير', en: 'Change' })}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProducts.map((entry, index) => (
                              <TableRow
                                key={`${entry.commodity.id}-${entry.region}-${entry.priceType}`}
                                className={
                                  index === filteredProducts.length - 1
                                    ? 'border-b-0 hover:bg-muted/20'
                                    : 'hover:bg-muted/20'
                                }
                              >
                                <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
                                  <span className="font-semibold text-foreground">
                                    {pickLocalizedField(language, {
                                      ar: entry.commodity.nameAr,
                                      en: entry.commodity.nameEn,
                                    })}
                                  </span>
                                </TableCell>
                                <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
                                  <Badge variant="outline">
                                    {categoryLabel(entry.commodity.category, language)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
                                  <span className="text-lg font-bold text-foreground">
                                    {formatPrice(entry.latestPrice)}
                                  </span>
                                  <span className="ms-1 text-sm text-muted-foreground">
                                    {pickLocalizedCopy(language, {
                                      ar: `جنيه/${unitLabel(entry.commodity.unit, language)}`,
                                      en: `EGP/${unitLabel(entry.commodity.unit, language)}`,
                                    })}
                                  </span>
                                </TableCell>
                                <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
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
                      <Search className="search-inline-icon-md absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={pickLocalizedCopy(language, {
                          ar: 'ابحث عن مورد...',
                          en: 'Search for a supplier...',
                        })}
                        value={supplierSearch}
                        onChange={(event) => setSupplierSearch(event.target.value)}
                        className="search-input-with-icon-md h-12 rounded-xl"
                      />
                    </div>
                    {canManageSuppliers && (
                      <Button className="gap-2" onClick={() => setSupplierDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        {pickLocalizedCopy(language, {
                          ar: 'إضافة مورد',
                          en: 'Add supplier',
                        })}
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
                      {filteredBusinesses.map((biz) => {
                        const businessName = pickLocalizedField(language, {
                          ar: biz.nameAr,
                          en: biz.nameEn,
                        });
                        const businessDescription =
                          language === 'en'
                            ? (biz.description?.trim() ?? '')
                            : (biz.descriptionAr?.trim() ?? biz.description?.trim() ?? '');

                        return (
                          <Card
                            key={biz.id}
                            className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                          >
                            <CardContent className="p-7">
                              <div className="mb-5 flex items-start gap-4">
                                <BusinessLogo
                                  src={biz.logoUrl}
                                  alt={businessName}
                                  fallbackIcon={Building2}
                                  className="h-16 w-16 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <h3 className="truncate text-lg font-bold text-foreground">
                                      {businessName}
                                    </h3>
                                    {biz.verificationStatus === 'verified' && (
                                      <Badge className="bg-primary/10 text-primary">
                                        {pickLocalizedCopy(language, {
                                          ar: 'موثق',
                                          en: 'Verified',
                                        })}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mb-2 text-sm text-muted-foreground">
                                    {categoryLabel(biz.category, language)}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    {districtLabel(biz.district ?? '', language)}
                                  </div>
                                </div>
                              </div>
                              <div className="mb-4 flex flex-wrap gap-1.5">
                                {biz.commodities.map((commodity) => (
                                  <Badge key={commodity.id} variant="secondary">
                                    {pickLocalizedField(language, {
                                      ar: commodity.nameAr,
                                      en: commodity.nameEn,
                                    })}
                                  </Badge>
                                ))}
                              </div>
                              {businessDescription && (
                                <p className="mb-5 line-clamp-3 text-sm text-muted-foreground">
                                  {businessDescription}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3">
                                <Button
                                  variant="outline"
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                  onClick={() => void navigate(`/marketplace/supplier/${biz.id}`)}
                                >
                                  {pickLocalizedCopy(language, {
                                    ar: 'عرض الملف',
                                    en: 'View profile',
                                  })}
                                </Button>
                                {biz.phone ? (
                                  <Button
                                    asChild
                                    className="flex-1 transition-transform hover:scale-[1.02]"
                                  >
                                    <a href={`tel:${biz.phone}`}>
                                      <Phone className="ms-2 h-4 w-4" />
                                      {pickLocalizedCopy(language, {
                                        ar: 'تواصل',
                                        en: 'Contact',
                                      })}
                                    </a>
                                  </Button>
                                ) : biz.website ? (
                                  <Button
                                    asChild
                                    className="flex-1 transition-transform hover:scale-[1.02]"
                                  >
                                    <a href={biz.website} target="_blank" rel="noreferrer">
                                      <ExternalLink className="ms-2 h-4 w-4" />
                                      {pickLocalizedCopy(language, {
                                        ar: 'زيارة الموقع',
                                        en: 'Visit website',
                                      })}
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
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
              <DialogTitle>
                {pickLocalizedCopy(language, {
                  ar: 'إضافة مورد جديد',
                  en: 'Add a new supplier',
                })}
              </DialogTitle>
              <DialogDescription>
                {pickLocalizedCopy(language, {
                  ar: 'اختر المحصول الرئيسي من القائمة، أو استخدم "أخرى" لإدخال محصول غير موجود.',
                  en: 'Choose the main commodity from the list, or use "Other" to enter one manually.',
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierName">
                  {pickLocalizedCopy(language, { ar: 'اسم المورد', en: 'Supplier name' })}
                </Label>
                <Input
                  id="supplierName"
                  value={supplierForm.nameAr}
                  onChange={(event) => handleSupplierFieldChange('nameAr', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {pickLocalizedCopy(language, {
                    ar: 'المحصول الرئيسي',
                    en: 'Primary commodity',
                  })}
                </Label>
                <Select
                  value={supplierForm.primaryCommodityId}
                  onValueChange={handlePrimaryCommodityChange}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={pickLocalizedCopy(language, {
                        ar: 'اختر المحصول الرئيسي',
                        en: 'Choose the primary commodity',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {commodities.map((commodity) => (
                      <SelectItem key={commodity.id} value={commodity.id}>
                        {pickLocalizedField(language, {
                          ar: commodity.nameAr,
                          en: commodity.nameEn,
                        })}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_COMMODITY_VALUE}>
                      {pickLocalizedCopy(language, { ar: 'أخرى', en: 'Other' })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {supplierForm.primaryCommodityId === OTHER_COMMODITY_VALUE && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplierCustomCommodity">
                    {pickLocalizedCopy(language, {
                      ar: 'حدد المحصول',
                      en: 'Custom commodity name',
                    })}
                  </Label>
                  <Input
                    id="supplierCustomCommodity"
                    value={supplierForm.customCommodityName}
                    onChange={(event) =>
                      handleSupplierFieldChange('customCommodityName', event.target.value)
                    }
                    placeholder={pickLocalizedCopy(language, {
                      ar: 'اكتب اسم المحصول',
                      en: 'Enter the commodity name',
                    })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(language, { ar: 'المنطقة', en: 'District' })}</Label>
                <Select
                  value={supplierForm.district}
                  onValueChange={(value) => handleSupplierFieldChange('district', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {localizedDistricts.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierPhone">
                  {pickLocalizedCopy(language, { ar: 'رقم التواصل', en: 'Phone number' })}
                </Label>
                <Input
                  id="supplierPhone"
                  value={supplierForm.phone}
                  onChange={(event) => handleSupplierFieldChange('phone', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierWebsite">
                  {pickLocalizedCopy(language, { ar: 'رابط الموقع', en: 'Website URL' })}
                </Label>
                <Input
                  id="supplierWebsite"
                  value={supplierForm.website}
                  onChange={(event) => handleSupplierFieldChange('website', event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierLogo">
                  {pickLocalizedCopy(language, { ar: 'رابط الشعار', en: 'Logo URL' })}
                </Label>
                <Input
                  id="supplierLogo"
                  value={supplierForm.logoUrl}
                  onChange={(event) => handleSupplierFieldChange('logoUrl', event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierDescription">
                {pickLocalizedCopy(language, { ar: 'الوصف', en: 'Description' })}
              </Label>
              <Textarea
                id="supplierDescription"
                rows={4}
                value={supplierForm.descriptionAr}
                onChange={(event) => handleSupplierFieldChange('descriptionAr', event.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {pickLocalizedCopy(language, {
                    ar: 'محاصيل مرتبطة إضافية (اختياري)',
                    en: 'Additional linked commodities (optional)',
                  })}
                </Label>
                {commoditiesLoading && (
                  <span className="text-sm text-muted-foreground">
                    {pickLocalizedCopy(language, { ar: 'جارٍ التحميل...', en: 'Loading...' })}
                  </span>
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
                      <p className="text-sm font-medium">
                        {pickLocalizedField(language, {
                          ar: commodity.nameAr,
                          en: commodity.nameEn,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(commodity.category, language)} ·{' '}
                        {unitLabel(commodity.unit, language)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetSupplierDialog} disabled={isSavingSupplier}>
                {pickLocalizedCopy(language, { ar: 'إلغاء', en: 'Cancel' })}
              </Button>
              <Button onClick={() => void handleCreateSupplier()} disabled={isSavingSupplier}>
                {isSavingSupplier
                  ? pickLocalizedCopy(language, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                  : pickLocalizedCopy(language, { ar: 'حفظ المورد', en: 'Save supplier' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </Layout>
  );
};

export default MarketplacePage;
