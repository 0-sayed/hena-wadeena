import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Leaf, PlusCircle, Tag } from 'lucide-react';
import { CommodityCategory, CommodityUnit, NvDistrict, PriceType } from '@hena-wadeena/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCommodities, useCommodity } from '@/hooks/use-commodities';
import { useAuth } from '@/hooks/use-auth';
import {
  categoryLabel,
  districtLabel,
  formatPrice,
  priceTypeLabel,
  unitLabel,
} from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';
import { commoditiesAPI, commodityPricesAPI } from '@/services/api';

const commodityCategories: CommodityCategory[] = [
  CommodityCategory.FRUITS,
  CommodityCategory.GRAINS,
  CommodityCategory.VEGETABLES,
  CommodityCategory.OILS,
  CommodityCategory.LIVESTOCK,
  CommodityCategory.OTHER,
];

const commodityUnits: CommodityUnit[] = [
  CommodityUnit.KG,
  CommodityUnit.TON,
  CommodityUnit.ARDEB,
  CommodityUnit.KANTAR,
  CommodityUnit.BOX,
  CommodityUnit.PIECE,
  CommodityUnit.LITER,
];

const districts: NvDistrict[] = [
  NvDistrict.KHARGA,
  NvDistrict.DAKHLA,
  NvDistrict.FARAFRA,
  NvDistrict.BARIS,
  NvDistrict.BALAT,
];

const priceTypes: PriceType[] = [PriceType.RETAIL, PriceType.WHOLESALE, PriceType.FARM_GATE];

type CropFormState = {
  id?: string;
  nameAr: string;
  nameEn: string;
  category: CommodityCategory;
  unit: CommodityUnit;
  sortOrder: string;
};

type PriceFormState = {
  priceId?: string;
  priceEgp: string;
  region: NvDistrict;
  priceType: PriceType;
  baselinePrice: number | null;
};

const emptyCropForm: CropFormState = {
  nameAr: '',
  nameEn: '',
  category: CommodityCategory.FRUITS,
  unit: CommodityUnit.KG,
  sortOrder: '0',
};

const emptyPriceForm: PriceFormState = {
  priceEgp: '',
  region: NvDistrict.KHARGA,
  priceType: PriceType.RETAIL,
  baselinePrice: null,
};

function getPriceChange(previousPrice: number | null, currentPrice: number | null) {
  if (previousPrice == null || previousPrice <= 0 || currentPrice == null) {
    return null;
  }

  const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
  if (!Number.isFinite(changePercent)) {
    return null;
  }

  return {
    changePercent,
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same',
  } as const;
}

export default function AdminCrops() {
  const queryClient = useQueryClient();
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const currencyLabel = pickLocalizedCopy(appLanguage, { ar: 'ج.م', en: 'EGP' });

  const { data: commodities, isLoading } = useCommodities();
  const [selectedCommodityId, setSelectedCommodityId] = useState<string | undefined>();
  const selectedCommodityQuery = useCommodity(selectedCommodityId);
  const [cropForm, setCropForm] = useState<CropFormState>(emptyCropForm);
  const [priceForm, setPriceForm] = useState<PriceFormState>(emptyPriceForm);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [savingCrop, setSavingCrop] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    if (!selectedCommodityId && commodities && commodities.length > 0) {
      setSelectedCommodityId(commodities[0].id);
    }
  }, [commodities, selectedCommodityId]);

  const selectedCommodity = selectedCommodityQuery.data;

  const formatCommodityName = (commodity: { nameAr: string; nameEn: string | null }) =>
    pickLocalizedField(appLanguage, {
      ar: commodity.nameAr,
      en: commodity.nameEn,
    }) || commodity.nameAr;

  const comparisonPrice = useMemo(() => {
    if (priceForm.priceId) {
      return priceForm.baselinePrice;
    }

    const matchingPrice = selectedCommodity?.latestPricesByRegion.find(
      (price) => price.region === priceForm.region && price.price_type === priceForm.priceType,
    );

    return matchingPrice?.price ?? null;
  }, [
    priceForm.baselinePrice,
    priceForm.priceId,
    priceForm.priceType,
    priceForm.region,
    selectedCommodity,
  ]);

  const parsedPrice = parseEgpInputToPiasters(priceForm.priceEgp);
  const priceChange = getPriceChange(comparisonPrice, parsedPrice);

  const refreshCommodities = () => {
    void queryClient.invalidateQueries({ queryKey: ['market'] });
  };

  const openCreateCropDialog = () => {
    setCropForm(emptyCropForm);
    setCropDialogOpen(true);
  };

  const openEditCropDialog = (commodity: NonNullable<typeof commodities>[number]) => {
    setCropForm({
      id: commodity.id,
      nameAr: commodity.nameAr,
      nameEn: commodity.nameEn ?? '',
      category: commodity.category,
      unit: commodity.unit,
      sortOrder: String(commodity.sortOrder),
    });
    setCropDialogOpen(true);
  };

  const openCreatePriceDialog = () => {
    setPriceForm(emptyPriceForm);
    setPriceDialogOpen(true);
  };

  const openEditPriceDialog = (
    price: NonNullable<typeof selectedCommodity>['latestPricesByRegion'][number],
  ) => {
    setPriceForm({
      priceId: price.id,
      priceEgp: String(price.price / 100),
      region: price.region,
      priceType: price.price_type,
      baselinePrice: price.price,
    });
    setPriceDialogOpen(true);
  };

  const handleSaveCrop = async () => {
    if (!cropForm.nameAr.trim()) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اسم المحصول بالعربية مطلوب',
          en: 'The Arabic crop name is required',
        }),
      );
      return;
    }

    setSavingCrop(true);
    try {
      const payload = {
        nameAr: cropForm.nameAr.trim(),
        nameEn: cropForm.nameEn.trim() || undefined,
        category: cropForm.category,
        unit: cropForm.unit,
        sortOrder: Number(cropForm.sortOrder) || 0,
      };

      if (cropForm.id) {
        await commoditiesAPI.update(cropForm.id, payload);
      } else {
        const created = await commoditiesAPI.create(payload);
        setSelectedCommodityId(created.id);
      }

      setCropForm(emptyCropForm);
      setCropDialogOpen(false);
      refreshCommodities();
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: cropForm.id ? 'تم تحديث المحصول' : 'تمت إضافة المحصول',
          en: cropForm.id ? 'Crop updated successfully' : 'Crop added successfully',
        }),
      );
    } catch (error) {
      const fallback = pickLocalizedCopy(appLanguage, {
        ar: 'تعذر حفظ المحصول',
        en: 'Could not save the crop',
      });
      toast.error(error instanceof Error ? error.message : fallback);
    } finally {
      setSavingCrop(false);
    }
  };

  const handleDeactivateCrop = async (id: string) => {
    try {
      await commoditiesAPI.deactivate(id);
      if (selectedCommodityId === id) {
        setSelectedCommodityId(undefined);
      }
      refreshCommodities();
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم حذف المحصول من القائمة النشطة',
          en: 'The crop was removed from the active list',
        }),
      );
    } catch (error) {
      const fallback = pickLocalizedCopy(appLanguage, {
        ar: 'تعذر حذف المحصول',
        en: 'Could not remove the crop',
      });
      toast.error(error instanceof Error ? error.message : fallback);
    }
  };

  const handleSavePrice = async () => {
    if (!selectedCommodityId) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر محصولاً أولاً',
          en: 'Select a crop first',
        }),
      );
      return;
    }

    if (parsedPrice == null) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'أدخل سعراً صحيحاً',
          en: 'Enter a valid price',
        }),
      );
      return;
    }

    setSavingPrice(true);
    try {
      const payload = {
        price: parsedPrice,
        priceType: priceForm.priceType,
        region: priceForm.region,
        recordedAt: new Date().toISOString(),
      };

      if (priceForm.priceId) {
        await commodityPricesAPI.update(priceForm.priceId, payload);
      } else {
        await commodityPricesAPI.create({
          commodityId: selectedCommodityId,
          ...payload,
        });
      }

      setPriceForm(emptyPriceForm);
      setPriceDialogOpen(false);
      refreshCommodities();
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: priceForm.priceId ? 'تم تحديث السعر' : 'تمت إضافة السعر',
          en: priceForm.priceId ? 'Price updated successfully' : 'Price added successfully',
        }),
      );
    } catch (error) {
      const fallback = pickLocalizedCopy(appLanguage, {
        ar: 'تعذر حفظ السعر',
        en: 'Could not save the price',
      });
      toast.error(error instanceof Error ? error.message : fallback);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeletePrice = async (id: string) => {
    try {
      await commodityPricesAPI.remove(id);
      refreshCommodities();
      if (priceForm.priceId === id) {
        setPriceForm(emptyPriceForm);
      }
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم حذف سجل السعر',
          en: 'Price record removed',
        }),
      );
    } catch (error) {
      const fallback = pickLocalizedCopy(appLanguage, {
        ar: 'تعذر حذف السعر',
        en: 'Could not remove the price',
      });
      toast.error(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {pickLocalizedCopy(appLanguage, {
              ar: 'إدارة المحاصيل والأسعار',
              en: 'Crop and price management',
            })}
          </h1>
          <p className="text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'استخدم نفس قائمة المحاصيل المستخدمة في البورصة، وأدر الأسعار من خلال نوافذ منبثقة بدلاً من النماذج الثابتة.',
              en: 'Use the same crop catalogue shown in the market, and manage prices from contextual dialogs instead of fixed forms.',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openCreateCropDialog}>
            <PlusCircle className="ml-2 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'إضافة محصول', en: 'Add crop' })}
          </Button>
          <Button variant="outline" onClick={openCreatePriceDialog} disabled={!selectedCommodity}>
            <Tag className="ml-2 h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'إضافة سعر', en: 'Add price' })}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pickLocalizedCopy(appLanguage, { ar: 'المحاصيل النشطة', en: 'Active crops' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !commodities || commodities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد محاصيل نشطة حالياً.',
                en: 'There are no active crops right now.',
              })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المحصول', en: 'Crop' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الفئة', en: 'Category' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الوحدة', en: 'Unit' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commodities.map((commodity) => (
                  <TableRow
                    key={commodity.id}
                    className={selectedCommodityId === commodity.id ? 'bg-muted/40' : ''}
                    onClick={() => setSelectedCommodityId(commodity.id)}
                  >
                    <TableCell className="font-medium">{formatCommodityName(commodity)}</TableCell>
                    <TableCell>{categoryLabel(commodity.category, appLanguage)}</TableCell>
                    <TableCell>{unitLabel(commodity.unit, appLanguage)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditCropDialog(commodity);
                          }}
                        >
                          {pickLocalizedCopy(appLanguage, { ar: 'تعديل', en: 'Edit' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeactivateCrop(commodity.id);
                          }}
                        >
                          {pickLocalizedCopy(appLanguage, { ar: 'حذف', en: 'Delete' })}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'أحدث الأسعار للمحصول المختار',
              en: 'Latest prices for the selected crop',
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCommodity ? (
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <p className="font-semibold text-foreground">{formatCommodityName(selectedCommodity)}</p>
              <p className="text-muted-foreground">
                {categoryLabel(selectedCommodity.category, appLanguage)} ·{' '}
                {unitLabel(selectedCommodity.unit, appLanguage)}
              </p>
            </div>
          ) : null}

          {selectedCommodityQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !selectedCommodity ? (
            <p className="text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'اختر محصولاً لعرض أسعاره.',
                en: 'Select a crop to view its prices.',
              })}
            </p>
          ) : selectedCommodity.latestPricesByRegion.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد أسعار مسجلة لهذا المحصول بعد.',
                en: 'No prices have been recorded for this crop yet.',
              })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'Region' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'نوع السعر', en: 'Price type' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'السعر', en: 'Price' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'التاريخ', en: 'Date' })}</TableHead>
                  <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCommodity.latestPricesByRegion.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell>{districtLabel(price.region, appLanguage)}</TableCell>
                    <TableCell>{priceTypeLabel(price.price_type, appLanguage)}</TableCell>
                    <TableCell>
                      <span>{formatPrice(price.price)}</span> <span>{currencyLabel}</span>
                    </TableCell>
                    <TableCell>{new Date(price.recorded_at).toLocaleDateString(locale)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditPriceDialog(price)}>
                          {pickLocalizedCopy(appLanguage, { ar: 'تعديل', en: 'Edit' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeletePrice(price.id)}
                        >
                          {pickLocalizedCopy(appLanguage, { ar: 'حذف', en: 'Delete' })}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {cropForm.id
                ? pickLocalizedCopy(appLanguage, { ar: 'تعديل محصول', en: 'Edit crop' })
                : pickLocalizedCopy(appLanguage, { ar: 'إضافة محصول جديد', en: 'Add a new crop' })}
            </DialogTitle>
            <DialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'أي تحديث هنا سينعكس مباشرة على صفحة البورصة ودليل الموردين.',
                en: 'Any update here is reflected directly on the market page and supplier directory.',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cropNameAr">
                {pickLocalizedCopy(appLanguage, { ar: 'الاسم بالعربية', en: 'Arabic name' })}
              </Label>
              <Input
                id="cropNameAr"
                value={cropForm.nameAr}
                onChange={(event) =>
                  setCropForm((previous) => ({ ...previous, nameAr: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cropNameEn">
                {pickLocalizedCopy(appLanguage, { ar: 'الاسم بالإنجليزية', en: 'English name' })}
              </Label>
              <Input
                id="cropNameEn"
                value={cropForm.nameEn}
                onChange={(event) =>
                  setCropForm((previous) => ({ ...previous, nameEn: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(appLanguage, { ar: 'الفئة', en: 'Category' })}</Label>
                <Select
                  value={cropForm.category}
                  onValueChange={(value) =>
                    setCropForm((previous) => ({
                      ...previous,
                      category: value as CommodityCategory,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commodityCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {categoryLabel(category, appLanguage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(appLanguage, { ar: 'الوحدة', en: 'Unit' })}</Label>
                <Select
                  value={cropForm.unit}
                  onValueChange={(value) =>
                    setCropForm((previous) => ({ ...previous, unit: value as CommodityUnit }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commodityUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unitLabel(unit, appLanguage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">
                  {pickLocalizedCopy(appLanguage, { ar: 'الترتيب', en: 'Sort order' })}
                </Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={cropForm.sortOrder}
                  onChange={(event) =>
                    setCropForm((previous) => ({ ...previous, sortOrder: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCropDialogOpen(false)} disabled={savingCrop}>
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
            </Button>
            <Button onClick={() => void handleSaveCrop()} disabled={savingCrop}>
              {savingCrop
                ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                : cropForm.id
                  ? pickLocalizedCopy(appLanguage, { ar: 'تحديث المحصول', en: 'Update crop' })
                  : pickLocalizedCopy(appLanguage, { ar: 'إضافة المحصول', en: 'Add crop' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {priceForm.priceId
                ? pickLocalizedCopy(appLanguage, { ar: 'تعديل سعر', en: 'Edit price' })
                : pickLocalizedCopy(appLanguage, { ar: 'إضافة سعر جديد', en: 'Add a new price' })}
            </DialogTitle>
            <DialogDescription>
              {selectedCommodity
                ? pickLocalizedCopy(appLanguage, {
                    ar: `يتم تحديث سعر ${formatCommodityName(selectedCommodity)} مع احتساب نسبة التغير تلقائياً.`,
                    en: `Update the price for ${formatCommodityName(selectedCommodity)} with the change percentage calculated automatically.`,
                  })
                : pickLocalizedCopy(appLanguage, {
                    ar: 'اختر محصولاً أولاً قبل إضافة السعر.',
                    en: 'Select a crop before adding a price.',
                  })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              {selectedCommodity ? (
                <>
                  <p className="font-semibold text-foreground">{formatCommodityName(selectedCommodity)}</p>
                  <p className="text-muted-foreground">
                    {categoryLabel(selectedCommodity.category, appLanguage)} ·{' '}
                    {unitLabel(selectedCommodity.unit, appLanguage)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'اختر محصولاً من الجدول لإدارة أسعاره.',
                    en: 'Select a crop from the table to manage its prices.',
                  })}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'Region' })}</Label>
                <Select
                  value={priceForm.region}
                  onValueChange={(value) =>
                    setPriceForm((previous) => ({ ...previous, region: value as NvDistrict }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {districtLabel(district, appLanguage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{pickLocalizedCopy(appLanguage, { ar: 'نوع السعر', en: 'Price type' })}</Label>
                <Select
                  value={priceForm.priceType}
                  onValueChange={(value) =>
                    setPriceForm((previous) => ({ ...previous, priceType: value as PriceType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priceTypes.map((priceType) => (
                      <SelectItem key={priceType} value={priceType}>
                        {priceTypeLabel(priceType, appLanguage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceValue">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'السعر (جنيه)',
                    en: 'Price (EGP)',
                  })}
                </Label>
                <Input
                  id="priceValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.priceEgp}
                  onChange={(event) =>
                    setPriceForm((previous) => ({ ...previous, priceEgp: event.target.value }))
                  }
                />
              </div>
            </div>

            {comparisonPrice != null && (
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, { ar: 'السعر السابق', en: 'Previous price' })}
                    </p>
                    <p className="text-lg font-semibold">
                      <span>{formatPrice(comparisonPrice)}</span> <span>{currencyLabel}</span>
                    </p>
                  </div>
                  {priceChange ? (
                    <div
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                        priceChange.direction === 'up'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : priceChange.direction === 'down'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {priceChange.direction === 'up' && <ArrowUp className="h-4 w-4" />}
                      {priceChange.direction === 'down' && <ArrowDown className="h-4 w-4" />}
                      {priceChange.direction === 'same'
                        ? pickLocalizedCopy(appLanguage, { ar: 'لا يوجد تغير', en: 'No change' })
                        : `${pickLocalizedCopy(appLanguage, {
                            ar: priceChange.direction === 'up' ? 'زيادة' : 'انخفاض',
                            en: priceChange.direction === 'up' ? 'Increase' : 'Decrease',
                          })} ${Math.abs(priceChange.changePercent).toFixed(2)}%`}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'أدخل السعر الجديد لاحتساب نسبة التغير.',
                        en: 'Enter the new price to calculate the change percentage.',
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)} disabled={savingPrice}>
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
            </Button>
            <Button onClick={() => void handleSavePrice()} disabled={savingPrice || !selectedCommodity}>
              {savingPrice
                ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                : priceForm.priceId
                  ? pickLocalizedCopy(appLanguage, { ar: 'تحديث السعر', en: 'Update price' })
                  : pickLocalizedCopy(appLanguage, { ar: 'إضافة السعر', en: 'Add price' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
