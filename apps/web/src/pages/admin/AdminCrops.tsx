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
import { useTranslation } from 'react-i18next';

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
  const {
    t
  } = useTranslation(['wallet', 'admin', 'dashboard', 'marketplace', 'guides', 'tourism', 'logistics', 'profile', 'market']);

  const queryClient = useQueryClient();
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const currencyLabel = t('transactions.currency');

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
        t('crops.nameArReq'),
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
      const fallback = t('crops.cropSaveErr');
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
        t('crops.cropDeleted'),
      );
    } catch (error) {
      const fallback = t('crops.cropDeleteErr');
      toast.error(error instanceof Error ? error.message : fallback);
    }
  };

  const handleSavePrice = async () => {
    if (!selectedCommodityId) {
      toast.error(
        t('crops.selectCropFirst'),
      );
      return;
    }

    if (parsedPrice == null) {
      toast.error(
        t('merchant.toasts.invalidPrice'),
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
      const fallback = t('crops.priceSaveErr');
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
        t('crops.priceDeleted'),
      );
    } catch (error) {
      const fallback = t('crops.priceDeleteErr');
      toast.error(error instanceof Error ? error.message : fallback);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('crops.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('crops.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openCreateCropDialog}>
            <PlusCircle className="ms-2 h-4 w-4" />
            {t('crops.addCropBtn')}
          </Button>
          <Button variant="outline" onClick={openCreatePriceDialog} disabled={!selectedCommodity}>
            <Tag className="ms-2 h-4 w-4" />
            {t('crops.addPrice')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('crops.activeCrops')}</CardTitle>
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
              {t('crops.noActiveCrops')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crops.table.crop')}</TableHead>
                  <TableHead>{t('prices.table.category')}</TableHead>
                  <TableHead>{t('supplierDetails.table.unit')}</TableHead>
                  <TableHead>{t('dashboard.packagesList.colActions')}</TableHead>
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
                          {t('booking.editBtn')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeactivateCrop(commodity.id);
                          }}
                        >
                          {t('transport.delete')}
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
            {t('crops.latestPrices')}
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
              {t('crops.selectCropPrices')}
            </p>
          ) : selectedCommodity.latestPricesByRegion.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('crops.noPrices')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crops.table.region')}</TableHead>
                  <TableHead>{t('crops.table.priceType')}</TableHead>
                  <TableHead>{t('prices.table.price')}</TableHead>
                  <TableHead>{t('booking.dateLabel')}</TableHead>
                  <TableHead>{t('dashboard.packagesList.colActions')}</TableHead>
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
                          {t('booking.editBtn')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeletePrice(price.id)}
                        >
                          {t('transport.delete')}
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
                ? t('crops.cropDialogTitleEdit')
                : t('crops.cropDialogTitleAdd')}
            </DialogTitle>
            <DialogDescription>
              {t('crops.cropDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cropNameAr">
                {t('crops.cropNameAr')}
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
                {t('crops.cropNameEn')}
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
                <Label>{t('prices.table.category')}</Label>
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
                <Label>{t('supplierDetails.table.unit')}</Label>
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
                  {t('crops.sortOrder')}
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
              {t('topup.cancelBtn')}
            </Button>
            <Button onClick={() => void handleSaveCrop()} disabled={savingCrop}>
              {savingCrop
                ? t('form.savingBtn')
                : cropForm.id
                  ? t('crops.updateCropBtn')
                  : t('crops.addCropBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {priceForm.priceId
                ? t('crops.priceDialogTitleEdit')
                : t('crops.priceDialogTitleAdd')}
            </DialogTitle>
            <DialogDescription>
              {selectedCommodity
                ? pickLocalizedCopy(appLanguage, {
                    ar: `يتم تحديث سعر ${formatCommodityName(selectedCommodity)} مع احتساب نسبة التغير تلقائياً.`,
                    en: `Update the price for ${formatCommodityName(selectedCommodity)} with the change percentage calculated automatically.`,
                  })
                : t('crops.priceDialogDescAdd')}
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
                  {t('crops.selectFromTable')}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('crops.table.region')}</Label>
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
                <Label>{t('crops.table.priceType')}</Label>
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
                  {t('listingEditor.priceLabel')}
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
                      {t('crops.previousPrice')}
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
                        ? t('crops.noChange')
                        : `${pickLocalizedCopy(appLanguage, {
                            ar: priceChange.direction === 'up' ? 'زيادة' : 'انخفاض',
                            en: priceChange.direction === 'up' ? 'Increase' : 'Decrease',
                          })} ${Math.abs(priceChange.changePercent).toFixed(2)}%`}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('crops.enterNewPrice')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)} disabled={savingPrice}>
              {t('topup.cancelBtn')}
            </Button>
            <Button onClick={() => void handleSavePrice()} disabled={savingPrice || !selectedCommodity}>
              {savingPrice
                ? t('form.savingBtn')
                : priceForm.priceId
                  ? t('crops.updatePriceBtn')
                  : t('crops.addPrice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
