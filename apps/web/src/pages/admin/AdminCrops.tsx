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
import { commoditiesAPI, commodityPricesAPI } from '@/services/api';
import { categoryLabel, districtLabel, formatPrice, priceTypeLabel, unitLabel } from '@/lib/format';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';

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

  const refreshCommodities = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['market', 'commodities'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'price-index'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'price-summary'] }),
      selectedCommodityId
        ? queryClient.invalidateQueries({
            queryKey: ['market', 'commodities', selectedCommodityId],
          })
        : Promise.resolve(),
    ]);
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
      toast.error('اسم المحصول بالعربية مطلوب');
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
      await refreshCommodities();
      toast.success(cropForm.id ? 'تم تحديث المحصول' : 'تمت إضافة المحصول');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ المحصول';
      toast.error(message);
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
      await refreshCommodities();
      toast.success('تم حذف المحصول من القائمة النشطة');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف المحصول';
      toast.error(message);
    }
  };

  const handleSavePrice = async () => {
    if (!selectedCommodityId) {
      toast.error('اختر محصولاً أولاً');
      return;
    }

    if (parsedPrice == null) {
      toast.error('أدخل سعراً صحيحاً');
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
      await refreshCommodities();
      toast.success(priceForm.priceId ? 'تم تحديث السعر' : 'تمت إضافة السعر');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ السعر';
      toast.error(message);
    } finally {
      setSavingPrice(false);
    }
  };

  const handleDeletePrice = async (id: string) => {
    try {
      await commodityPricesAPI.remove(id);
      await refreshCommodities();
      if (priceForm.priceId === id) {
        setPriceForm(emptyPriceForm);
      }
      toast.success('تم حذف سجل السعر');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف السعر';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المحاصيل والأسعار</h1>
          <p className="text-muted-foreground">
            استخدم نفس قائمة المحاصيل المستخدمة في البورصة، وأدر الأسعار من خلال نوافذ منبثقة بدلاً
            من النماذج الثابتة.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={openCreateCropDialog}>
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة محصول
          </Button>
          <Button variant="outline" onClick={openCreatePriceDialog} disabled={!selectedCommodity}>
            <Tag className="ml-2 h-4 w-4" />
            إضافة سعر
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المحاصيل النشطة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !commodities || commodities.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد محاصيل نشطة حالياً.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المحصول</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الوحدة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commodities.map((commodity) => (
                  <TableRow
                    key={commodity.id}
                    className={selectedCommodityId === commodity.id ? 'bg-muted/40' : ''}
                    onClick={() => setSelectedCommodityId(commodity.id)}
                  >
                    <TableCell className="font-medium">{commodity.nameAr}</TableCell>
                    <TableCell>{categoryLabel(commodity.category)}</TableCell>
                    <TableCell>{unitLabel(commodity.unit)}</TableCell>
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
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeactivateCrop(commodity.id);
                          }}
                        >
                          حذف
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
            أحدث الأسعار للمحصول المختار
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCommodity ? (
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <p className="font-semibold text-foreground">{selectedCommodity.nameAr}</p>
              <p className="text-muted-foreground">
                {categoryLabel(selectedCommodity.category)} · {unitLabel(selectedCommodity.unit)}
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
            <p className="text-sm text-muted-foreground">اختر محصولاً لعرض أسعاره.</p>
          ) : selectedCommodity.latestPricesByRegion.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد أسعار مسجلة لهذا المحصول بعد.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>نوع السعر</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCommodity.latestPricesByRegion.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell>{districtLabel(price.region)}</TableCell>
                    <TableCell>{priceTypeLabel(price.price_type)}</TableCell>
                    <TableCell>{formatPrice(price.price)} ج.م</TableCell>
                    <TableCell>{new Date(price.recorded_at).toLocaleDateString('ar-EG')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditPriceDialog(price)}
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDeletePrice(price.id)}
                        >
                          حذف
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
            <DialogTitle>{cropForm.id ? 'تعديل محصول' : 'إضافة محصول جديد'}</DialogTitle>
            <DialogDescription>
              أي تحديث هنا سينعكس مباشرة على صفحة البورصة ودليل الموردين.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cropNameAr">الاسم بالعربية</Label>
              <Input
                id="cropNameAr"
                value={cropForm.nameAr}
                onChange={(event) =>
                  setCropForm((prev) => ({ ...prev, nameAr: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cropNameEn">الاسم بالإنجليزية</Label>
              <Input
                id="cropNameEn"
                value={cropForm.nameEn}
                onChange={(event) =>
                  setCropForm((prev) => ({ ...prev, nameEn: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select
                  value={cropForm.category}
                  onValueChange={(value) =>
                    setCropForm((prev) => ({ ...prev, category: value as CommodityCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commodityCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {categoryLabel(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الوحدة</Label>
                <Select
                  value={cropForm.unit}
                  onValueChange={(value) =>
                    setCropForm((prev) => ({ ...prev, unit: value as CommodityUnit }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commodityUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unitLabel(unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">الترتيب</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={cropForm.sortOrder}
                  onChange={(event) =>
                    setCropForm((prev) => ({ ...prev, sortOrder: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCropDialogOpen(false)}
              disabled={savingCrop}
            >
              إلغاء
            </Button>
            <Button onClick={() => void handleSaveCrop()} disabled={savingCrop}>
              {savingCrop ? 'جارٍ الحفظ...' : cropForm.id ? 'تحديث المحصول' : 'إضافة المحصول'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{priceForm.priceId ? 'تعديل سعر' : 'إضافة سعر جديد'}</DialogTitle>
            <DialogDescription>
              {selectedCommodity
                ? `يتم تحديث سعر ${selectedCommodity.nameAr} مع احتساب نسبة التغير تلقائياً.`
                : 'اختر محصولاً أولاً قبل إضافة السعر.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              {selectedCommodity ? (
                <>
                  <p className="font-semibold text-foreground">{selectedCommodity.nameAr}</p>
                  <p className="text-muted-foreground">
                    {categoryLabel(selectedCommodity.category)} ·{' '}
                    {unitLabel(selectedCommodity.unit)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">اختر محصولاً من الجدول لإدارة أسعاره.</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>المنطقة</Label>
                <Select
                  value={priceForm.region}
                  onValueChange={(value) =>
                    setPriceForm((prev) => ({ ...prev, region: value as NvDistrict }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {districtLabel(district)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع السعر</Label>
                <Select
                  value={priceForm.priceType}
                  onValueChange={(value) =>
                    setPriceForm((prev) => ({ ...prev, priceType: value as PriceType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priceTypes.map((priceType) => (
                      <SelectItem key={priceType} value={priceType}>
                        {priceTypeLabel(priceType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceValue">السعر (جنيه)</Label>
                <Input
                  id="priceValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.priceEgp}
                  onChange={(event) =>
                    setPriceForm((prev) => ({ ...prev, priceEgp: event.target.value }))
                  }
                />
              </div>
            </div>

            {comparisonPrice != null && (
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">السعر السابق</p>
                    <p className="text-lg font-semibold">{formatPrice(comparisonPrice)} ج.م</p>
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
                        ? 'لا يوجد تغير'
                        : `${priceChange.direction === 'up' ? 'زيادة' : 'انخفاض'} ${Math.abs(
                            priceChange.changePercent,
                          ).toFixed(2)}%`}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      أدخل السعر الجديد لاحتساب نسبة التغير.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setPriceDialogOpen(false)}
              disabled={savingPrice}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => void handleSavePrice()}
              disabled={savingPrice || !selectedCommodity}
            >
              {savingPrice ? 'جارٍ الحفظ...' : priceForm.priceId ? 'تحديث السعر' : 'إضافة السعر'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
