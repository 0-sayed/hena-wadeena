import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole } from '@hena-wadeena/types';
import { listingsAPI, type Listing, type ProduceDetails } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/query-keys';
import { DISTRICTS, produceCommodityTypeLabels } from '@/lib/format';

interface ProduceListingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialListing?: Listing;
  onSuccess?: () => void;
}

const COMMODITY_TYPES = Object.entries(produceCommodityTypeLabels).map(([id, name]) => ({
  id: id as ProduceDetails['commodity_type'],
  name,
}));

const STORAGE_TYPES = [
  { id: 'field', name: 'في الحقل' },
  { id: 'warehouse', name: 'مخزن' },
  { id: 'cold_storage', name: 'تبريد' },
] as const;

const BUYER_TYPES = [
  { id: 'any', name: 'الكل' },
  { id: 'wholesaler', name: 'تاجر جملة' },
  { id: 'exporter', name: 'مصدر' },
  { id: 'local', name: 'محلي' },
] as const;

const CERTIFICATIONS = [
  { id: 'organic', name: 'عضوي' },
  { id: 'gap', name: 'GAP' },
  { id: 'other', name: 'أخرى' },
] as const;

type CertificationType = 'organic' | 'gap' | 'other';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('تعذر قراءة الصورة'));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}

export function ProduceListingSheet({
  open,
  onOpenChange,
  initialListing,
  onSuccess,
}: ProduceListingSheetProps) {
  const isEditMode = initialListing !== undefined;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const primaryImageInputRef = useRef<HTMLInputElement | null>(null);

  const pd = initialListing?.produceDetails;

  // Standard listing fields — initialized from initialListing when in edit mode
  const [titleAr, setTitleAr] = useState(() => initialListing?.titleAr ?? '');
  const [transaction, setTransaction] = useState<'sale' | 'rent'>(
    () => (initialListing?.transaction as 'sale' | 'rent') ?? 'sale',
  );
  const [priceEgp, setPriceEgp] = useState(() =>
    initialListing ? String(initialListing.price / 100) : '',
  );
  const [district, setDistrict] = useState(() => initialListing?.district ?? '');
  const [imageUrls, setImageUrls] = useState<string[]>(() => initialListing?.images ?? []);

  // Produce-specific fields
  const [commodityType, setCommodityType] = useState<ProduceDetails['commodity_type']>(
    () => pd?.commodityType ?? 'dates',
  );
  const [quantityKg, setQuantityKg] = useState(() => pd?.quantityKg ?? '');
  const [harvestDate, setHarvestDate] = useState(() => pd?.harvestDate ?? '');
  const [storageType, setStorageType] = useState<ProduceDetails['storage_type']>(
    () => (pd?.storageType as ProduceDetails['storage_type']) ?? 'field',
  );
  const [certifications, setCertifications] = useState<CertificationType[]>(
    () => (pd?.certifications as CertificationType[]) ?? [],
  );
  const [preferredBuyer, setPreferredBuyer] = useState<ProduceDetails['preferred_buyer']>(
    () => (pd?.preferredBuyer as ProduceDetails['preferred_buyer']) ?? 'any',
  );
  const [contactPhone, setContactPhone] = useState(() => pd?.contactPhone ?? '');
  const [contactWhatsapp, setContactWhatsapp] = useState(() => pd?.contactWhatsapp ?? '');

  // Re-seed form state whenever the sheet opens or the initial listing changes.
  // Without this, canceling and reopening the same flow leaves stale edits.
  useEffect(() => {
    if (!open) return;
    const details = initialListing?.produceDetails;
    setTitleAr(initialListing?.titleAr ?? '');
    setTransaction((initialListing?.transaction as 'sale' | 'rent') ?? 'sale');
    setPriceEgp(initialListing ? String(initialListing.price / 100) : '');
    setDistrict(initialListing?.district ?? '');
    setImageUrls(initialListing?.images ?? []);
    setCommodityType(details?.commodityType ?? 'dates');
    setQuantityKg(details?.quantityKg ?? '');
    setHarvestDate(details?.harvestDate ?? '');
    setStorageType((details?.storageType as ProduceDetails['storage_type']) ?? 'field');
    setCertifications((details?.certifications as CertificationType[]) ?? []);
    setPreferredBuyer((details?.preferredBuyer as ProduceDetails['preferred_buyer']) ?? 'any');
    setContactPhone(details?.contactPhone ?? '');
    setContactWhatsapp(details?.contactWhatsapp ?? '');
  }, [open, initialListing]);

  const createMutation = useMutation({
    mutationFn: listingsAPI.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.listings() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof listingsAPI.update>[1];
    }) => listingsAPI.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.market.listings() });
    },
  });

  function resetForm() {
    setTitleAr('');
    setTransaction('sale');
    setPriceEgp('');
    setDistrict('');
    setImageUrls([]);
    setCommodityType('dates');
    setQuantityKg('');
    setHarvestDate('');
    setStorageType('field');
    setCertifications([]);
    setPreferredBuyer('any');
    setContactPhone('');
    setContactWhatsapp('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const price = Math.round(parseFloat(priceEgp) * 100);
    if (!isFinite(price) || price <= 0) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }

    if (!titleAr.trim()) {
      toast.error('يرجى إدخال عنوان الإعلان');
      return;
    }

    if (!district) {
      toast.error('يرجى اختيار المدينة');
      return;
    }

    const images = imageUrls.map((imageUrl) => imageUrl.trim()).filter(Boolean);

    const produceDetails: ProduceDetails = {
      commodity_type: commodityType,
      storage_type: storageType,
      preferred_buyer: preferredBuyer,
      quantity_kg: quantityKg ? Number(quantityKg) : undefined,
      harvest_date: harvestDate || undefined,
      certifications: certifications.length > 0 ? certifications : undefined,
      contact_phone: contactPhone || undefined,
      contact_whatsapp: contactWhatsapp || undefined,
    };

    const payload = {
      transaction,
      titleAr: titleAr.trim(),
      price,
      priceUnit: 'kg' as const,
      district,
      images: images.length > 0 ? images : undefined,
      produce_details: produceDetails,
    };

    try {
      if (isEditMode && initialListing) {
        await updateMutation.mutateAsync({ id: initialListing.id, payload });
        toast.success('تم تحديث العرض بنجاح');
        onSuccess?.();
        onOpenChange(false);
      } else {
        await createMutation.mutateAsync({
          ...payload,
          listingType: 'business',
          category: 'agricultural_produce',
        });
        if (user?.role === UserRole.ADMIN) {
          toast.success('تم نشر العرض بنجاح');
        } else {
          toast.success('تم إرسال عرضك بنجاح', {
            description: 'سيظهر العرض بعد مراجعته والموافقة عليه من الإدارة.',
          });
        }
        onSuccess?.();
        resetForm();
        onOpenChange(false);
      }
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  }

  function toggleCertification(cert: CertificationType) {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert],
    );
  }

  async function handleImageFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGE_COUNT - imageUrls.length;
    if (remainingSlots <= 0) {
      toast.error(`يمكنك إضافة حتى ${MAX_IMAGE_COUNT} صور`);
      event.target.value = '';
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    const invalidFile = selectedFiles.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
    if (invalidFile) {
      toast.error('يرجى اختيار ملف صورة');
      event.target.value = '';
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_IMAGE_BYTES);
    if (oversizedFile) {
      toast.error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
      event.target.value = '';
      return;
    }

    try {
      const nextImageUrls = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      setImageUrls((prev) => [...prev, ...nextImageUrls]);
      toast.success(
        nextImageUrls.length === 1
          ? 'تم تجهيز الصورة وستظهر بعد النشر'
          : `تم تجهيز ${nextImageUrls.length} صور وستظهر بعد النشر`,
      );
      if (files.length > remainingSlots) {
        toast.error(`تمت إضافة ${remainingSlots} صور فقط. الحد الأقصى ${MAX_IMAGE_COUNT} صور`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة الصورة');
    } finally {
      event.target.value = '';
    }
  }

  function removeImageAt(index: number) {
    setImageUrls((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
    primaryImageInputRef.current?.focus();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        data-slot="produce-dialog-content"
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-md p-4 sm:max-w-2xl sm:p-6 md:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'تعديل عرض زراعي' : 'نشر عرض زراعي'}</DialogTitle>
          <DialogDescription>
            أدخل بيانات العرض والصور التي ستظهر في بطاقة المنتج.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* Standard listing fields */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">معلومات الإعلان</h3>

            <div className="space-y-2">
              <Label htmlFor="titleAr">عنوان الإعلان</Label>
              <Input
                id="titleAr"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="مثال: تمور سيوي جودة عالية"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>نوع المعاملة</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={transaction === 'sale' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTransaction('sale')}
                >
                  بيع
                </Button>
                <Button
                  type="button"
                  variant={transaction === 'rent' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTransaction('rent')}
                >
                  إيجار
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">السعر (جنيه/كجم)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={priceEgp}
                onChange={(e) => setPriceEgp(e.target.value)}
                placeholder="مثال: 25.50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">المدينة</Label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger id="district">
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="primaryImageFile">رفع صورة المنتج</Label>
                  <p className="text-xs text-muted-foreground">
                    حتى {MAX_IMAGE_COUNT} صور. JPG أو PNG أو WebP، حتى 5 ميجابايت لكل صورة.
                  </p>
                </div>
                <input
                  ref={primaryImageInputRef}
                  id="primaryImageFile"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    void handleImageFiles(event);
                  }}
                />

                <div className="rounded-md border border-dashed bg-muted/20 p-3">
                  <div className="mb-3 space-y-1">
                    <p className="text-sm font-medium">صور المنتج</p>
                    <p className="text-xs text-muted-foreground">
                      أول صورة تظهر كصورة رئيسية في بطاقة المنتج.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {imageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="relative aspect-square overflow-hidden rounded-md border bg-background"
                      >
                        <img
                          src={imageUrl}
                          alt={`معاينة صورة المنتج ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {index === 0 ? (
                          <span className="absolute end-2 top-2 rounded bg-background/90 px-2 py-0.5 text-[11px] font-medium">
                            رئيسية
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute start-2 top-2 h-7 w-7 bg-background/90 hover:bg-background"
                          aria-label={`إزالة صورة ${index + 1}`}
                          onClick={() => removeImageAt(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {imageUrls.length < MAX_IMAGE_COUNT ? (
                      <button
                        type="button"
                        className="flex aspect-square min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/70 p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() => primaryImageInputRef.current?.click()}
                      >
                        <ImagePlus className="h-7 w-7" />
                        {imageUrls.length > 0 ? 'إضافة صور' : 'اختيار صور'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Produce-specific fields */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm text-muted-foreground">تفاصيل المنتج</h3>

            <div className="space-y-2">
              <Label htmlFor="commodityType">نوع المحصول</Label>
              <Select
                value={commodityType}
                onValueChange={(v) => setCommodityType(v as ProduceDetails['commodity_type'])}
              >
                <SelectTrigger id="commodityType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMODITY_TYPES.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantityKg">الكمية (كجم)</Label>
              <Input
                id="quantityKg"
                type="number"
                min="0"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                placeholder="اختياري"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="harvestDate">تاريخ الحصاد</Label>
              <Input
                id="harvestDate"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storageType">طريقة التخزين</Label>
              <Select
                value={storageType}
                onValueChange={(v) => setStorageType(v as ProduceDetails['storage_type'])}
              >
                <SelectTrigger id="storageType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_TYPES.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الشهادات</Label>
              <div className="flex flex-wrap gap-3">
                {CERTIFICATIONS.map((cert) => (
                  <div key={cert.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cert-${cert.id}`}
                      checked={certifications.includes(cert.id)}
                      onCheckedChange={() => toggleCertification(cert.id)}
                    />
                    <Label htmlFor={`cert-${cert.id}`} className="font-normal cursor-pointer">
                      {cert.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredBuyer">المشتري المفضل</Label>
              <Select
                value={preferredBuyer}
                onValueChange={(v) => setPreferredBuyer(v as ProduceDetails['preferred_buyer'])}
              >
                <SelectTrigger id="preferredBuyer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUYER_TYPES.map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>
                      {bt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact fields */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm text-muted-foreground">معلومات التواصل</h3>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">رقم الهاتف</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="اختياري"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactWhatsapp">رقم الواتساب</Label>
              <Input
                id="contactWhatsapp"
                type="tel"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="اختياري"
                dir="ltr"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'جاري الحفظ...'
              : isEditMode
                ? 'حفظ التعديلات'
                : 'نشر العرض'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
