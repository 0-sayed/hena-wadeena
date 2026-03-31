import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Leaf, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCommodities, useCommodity } from '@/hooks/use-commodities';
import { commoditiesAPI, commodityPricesAPI } from '@/services/api';
import type { CommodityCategory, CommodityUnit, NvDistrict, PriceType } from '@hena-wadeena/types';
import { categoryLabel, districtLabel, formatPrice, unitLabel } from '@/lib/format';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';

const commodityCategories: CommodityCategory[] = [
  'fruits',
  'grains',
  'vegetables',
  'oils',
  'livestock',
  'other',
];

const commodityUnits: CommodityUnit[] = ['kg', 'ton', 'ardeb', 'kantar', 'box', 'piece', 'liter'];
const districts: NvDistrict[] = ['kharga', 'dakhla', 'farafra', 'baris', 'balat'];
const priceTypes: PriceType[] = ['retail', 'wholesale', 'farm_gate'];

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
};

const emptyCropForm: CropFormState = {
  nameAr: '',
  nameEn: '',
  category: 'fruits',
  unit: 'kg',
  sortOrder: '0',
};

const emptyPriceForm: PriceFormState = {
  priceEgp: '',
  region: 'kharga',
  priceType: 'retail',
};

export default function AdminCrops() {
  const queryClient = useQueryClient();
  const { data: commodities, isLoading } = useCommodities();
  const [selectedCommodityId, setSelectedCommodityId] = useState<string | undefined>();
  const selectedCommodityQuery = useCommodity(selectedCommodityId);
  const [cropForm, setCropForm] = useState<CropFormState>(emptyCropForm);
  const [priceForm, setPriceForm] = useState<PriceFormState>(emptyPriceForm);
  const [savingCrop, setSavingCrop] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    if (!selectedCommodityId && commodities && commodities.length > 0) {
      setSelectedCommodityId(commodities[0].id);
    }
  }, [commodities, selectedCommodityId]);

  const refreshCommodities = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['market', 'commodities'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'price-index'] }),
      queryClient.invalidateQueries({ queryKey: ['market', 'price-summary'] }),
      selectedCommodityId
        ? queryClient.invalidateQueries({ queryKey: ['market', 'commodities', selectedCommodityId] })
        : Promise.resolve(),
    ]);
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

    const price = parseEgpInputToPiasters(priceForm.priceEgp);
    if (price == null) {
      toast.error('أدخل سعراً صحيحاً');
      return;
    }

    setSavingPrice(true);
    try {
      const payload = {
        price,
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

  const selectedCommodity = selectedCommodityQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المحاصيل والأسعار</h1>
        <p className="text-muted-foreground">
          إضافة المحاصيل وتحديث بياناتها وإدارة آخر أسعارها بحسب المنطقة.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{cropForm.id ? 'تعديل محصول' : 'إضافة محصول جديد'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="flex gap-3">
              <Button onClick={() => void handleSaveCrop()} disabled={savingCrop}>
                <PlusCircle className="ml-2 h-4 w-4" />
                {savingCrop ? 'جارٍ الحفظ...' : cropForm.id ? 'تحديث المحصول' : 'إضافة المحصول'}
              </Button>
              {cropForm.id && (
                <Button variant="outline" onClick={() => setCropForm(emptyCropForm)}>
                  إلغاء
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{priceForm.priceId ? 'تعديل سعر' : 'إضافة سعر جديد'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              {selectedCommodity ? (
                <>
                  <p className="font-semibold text-foreground">{selectedCommodity.nameAr}</p>
                  <p className="text-muted-foreground">
                    {categoryLabel(selectedCommodity.category)} • {unitLabel(selectedCommodity.unit)}
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
                        {priceType}
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
            <div className="flex gap-3">
              <Button onClick={() => void handleSavePrice()} disabled={savingPrice || !selectedCommodity}>
                {savingPrice ? 'جارٍ الحفظ...' : priceForm.priceId ? 'تحديث السعر' : 'إضافة السعر'}
              </Button>
              {priceForm.priceId && (
                <Button variant="outline" onClick={() => setPriceForm(emptyPriceForm)}>
                  إلغاء
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
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
                            setCropForm({
                              id: commodity.id,
                              nameAr: commodity.nameAr,
                              nameEn: commodity.nameEn ?? '',
                              category: commodity.category,
                              unit: commodity.unit,
                              sortOrder: String(commodity.sortOrder),
                            });
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
        <CardContent>
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
                    <TableCell>{price.price_type}</TableCell>
                    <TableCell>{formatPrice(price.price)} ج.م</TableCell>
                    <TableCell>
                      {new Date(price.recorded_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPriceForm({
                              priceId: price.id,
                              priceEgp: String(price.price / 100),
                              region: price.region,
                              priceType: price.price_type,
                            })
                          }
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
    </div>
  );
}
