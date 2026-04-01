import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@hena-wadeena/types';
import { Bus, ExternalLink, MapPin, Pencil, Phone, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinesses } from '@/hooks/use-businesses';
import { useAuth } from '@/hooks/use-auth';
import { businessesAPI } from '@/services/api';
import { districtLabel, DISTRICTS } from '@/lib/format';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Skeleton } from '@/components/motion/Skeleton';
import { Textarea } from '@/components/ui/textarea';

type TransportFormState = {
  id?: string;
  nameAr: string;
  district: string;
  headquarters: string;
  bookingLink: string;
  contactInfo: string;
  generalInfo: string;
  logoUrl: string;
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const emptyTransportForm: TransportFormState = {
  nameAr: '',
  district: 'kharga',
  headquarters: '',
  bookingLink: '',
  contactInfo: '',
  generalInfo: '',
  logoUrl: '',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('تعذر قراءة الشعار'));
    };
    reader.onerror = () => reject(new Error('تعذر قراءة الشعار'));
    reader.readAsDataURL(file);
  });
}

export function LocalTransportTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const canManageCompanies = user?.role === UserRole.ADMIN;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TransportFormState>(emptyTransportForm);
  const [saving, setSaving] = useState(false);

  const {
    data: companies,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useBusinesses({ category: 'transport' });

  const updateField = (field: keyof TransportFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateDialog = () => {
    setForm(emptyTransportForm);
    setDialogOpen(true);
  };

  const openEditDialog = (company: (typeof companies)[number]) => {
    setForm({
      id: company.id,
      nameAr: company.nameAr,
      district: company.district ?? 'kharga',
      headquarters: company.description ?? '',
      bookingLink: company.website ?? '',
      contactInfo: company.phone ?? '',
      generalInfo: company.descriptionAr ?? '',
      logoUrl: company.logoUrl ?? '',
    });
    setDialogOpen(true);
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('اختر صورة بصيغة JPG أو PNG أو WebP');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast.error('حجم الشعار يجب ألا يتجاوز 2 ميجابايت');
      event.target.value = '';
      return;
    }

    try {
      const logoUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({ ...prev, logoUrl }));
      toast.success('تم رفع الشعار وسيظهر بعد الحفظ');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر قراءة الشعار';
      toast.error(message);
    } finally {
      event.target.value = '';
    }
  };

  const refreshCompanies = async () => {
    await queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });
  };

  const handleSaveCompany = async () => {
    if (!form.nameAr.trim()) {
      toast.error('اسم الشركة مطلوب');
      return;
    }

    if (!form.district) {
      toast.error('اختر المنطقة');
      return;
    }

    if (form.bookingLink.trim() && !/^https?:\/\//i.test(form.bookingLink.trim())) {
      toast.error('رابط الحجز يجب أن يبدأ بـ http:// أو https://');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nameAr: form.nameAr.trim(),
        category: 'transport',
        district: form.district,
        description: form.headquarters.trim() || undefined,
        descriptionAr: form.generalInfo.trim() || undefined,
        phone: form.contactInfo.trim() || undefined,
        website: form.bookingLink.trim() || undefined,
        logoUrl: form.logoUrl || undefined,
      };

      if (form.id) {
        await businessesAPI.update(form.id, payload);
      } else {
        await businessesAPI.create(payload);
      }

      await refreshCompanies();
      setDialogOpen(false);
      setForm(emptyTransportForm);
      toast.success(form.id ? 'تم تحديث شركة النقل' : 'تمت إضافة شركة النقل');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ شركة النقل';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!window.confirm('هل تريد حذف شركة النقل هذه؟')) {
      return;
    }

    try {
      await businessesAPI.remove(companyId);
      await refreshCompanies();
      toast.success('تم حذف شركة النقل');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف شركة النقل';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">شركات النقل المحلي</h3>
          <p className="text-muted-foreground">
            دليل شركات النقل والحافلات داخل الوادي الجديد مع روابط الحجز وبيانات التواصل.
          </p>
        </div>
        {canManageCompanies && (
          <Button onClick={openCreateDialog}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة شركة نقل
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} h="h-64" className="rounded-2xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-14 text-center">
            <Bus className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد شركات نقل محلية مسجلة حالياً.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.id} className="rounded-2xl border-border/60">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.nameAr}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Bus className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-bold text-foreground">{company.nameAr}</h4>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{districtLabel(company.district ?? '')}</span>
                    </div>
                  </div>
                </div>

                {company.description && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">المقر</p>
                    <p className="text-sm text-foreground">{company.description}</p>
                  </div>
                )}

                {company.descriptionAr && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">نبذة عامة</p>
                    <p className="text-sm text-foreground">{company.descriptionAr}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {company.phone && (
                    <Button asChild variant="outline" className="flex-1">
                      <a href={`tel:${company.phone}`}>
                        <Phone className="ml-2 h-4 w-4" />
                        {company.phone}
                      </a>
                    </Button>
                  )}
                  {company.website && (
                    <Button asChild className="flex-1">
                      <a href={company.website} target="_blank" rel="noreferrer">
                        <ExternalLink className="ml-2 h-4 w-4" />
                        رابط الحجز
                      </a>
                    </Button>
                  )}
                </div>

                {canManageCompanies && (
                  <div className="flex gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(company)}>
                      <Pencil className="ml-2 h-4 w-4" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDeleteCompany(company.id)}
                    >
                      <Trash2 className="ml-2 h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LoadMoreButton
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'تعديل شركة النقل' : 'إضافة شركة نقل'}</DialogTitle>
            <DialogDescription>
              أضف بيانات الحجز والتواصل والشعار لتظهر مباشرة داخل تبويب النقل المحلي.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transportName">اسم الشركة</Label>
              <Input
                id="transportName"
                value={form.nameAr}
                onChange={(event) => updateField('nameAr', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>المنطقة</Label>
              <Select
                value={form.district}
                onValueChange={(value) => updateField('district', value)}
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="transportHeadquarters">المقر</Label>
              <Input
                id="transportHeadquarters"
                value={form.headquarters}
                onChange={(event) => updateField('headquarters', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportBooking">رابط الحجز</Label>
              <Input
                id="transportBooking"
                value={form.bookingLink}
                onChange={(event) => updateField('bookingLink', event.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportContact">بيانات التواصل</Label>
              <Input
                id="transportContact"
                value={form.contactInfo}
                onChange={(event) => updateField('contactInfo', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transportInfo">معلومات عامة</Label>
            <Textarea
              id="transportInfo"
              rows={4}
              value={form.generalInfo}
              onChange={(event) => updateField('generalInfo', event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>الشعار</Label>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="ml-2 h-4 w-4" />
                رفع الشعار
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                void handleLogoSelected(event);
              }}
            />
            {form.logoUrl ? (
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border bg-muted/30">
                <img
                  src={form.logoUrl}
                  alt={form.nameAr || 'logo'}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لم يتم رفع شعار بعد.</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={() => void handleSaveCompany()} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : form.id ? 'تحديث الشركة' : 'إضافة الشركة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
