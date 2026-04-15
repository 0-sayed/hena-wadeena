import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@hena-wadeena/types';
import { Bus, ExternalLink, MapPin, Pencil, Phone, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { BusinessLogo } from '@/components/business/BusinessLogo';
import { useBusinesses } from '@/hooks/use-businesses';
import { useAuth } from '@/hooks/use-auth';
import { businessesAPI } from '@/services/api';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_LOGO_BYTES,
  compressImage,
  readFileAsDataUrl,
} from '@/lib/upload';
import { pickLocalizedCopy, pickLocalizedField } from '@/lib/localization';
import { districtLabel, DISTRICTS } from '@/lib/format';
import { LoadMoreButton } from '@/components/LoadMoreButton';
import { LtrText } from '@/components/ui/ltr-text';
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

const emptyTransportForm: TransportFormState = {
  nameAr: '',
  district: 'kharga',
  headquarters: '',
  bookingLink: '',
  contactInfo: '',
  generalInfo: '',
  logoUrl: '',
};

export function LocalTransportTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, language: appLanguage } = useAuth();
  const canManageCompanies = user?.role === UserRole.ADMIN;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TransportFormState>(emptyTransportForm);
  const [saving, setSaving] = useState(false);
  const districtOptions = DISTRICTS.map((district) => ({
    id: district.id,
    label: districtLabel(district.id, appLanguage),
  }));

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
      generalInfo: appLanguage === 'ar' ? (company.descriptionAr ?? '') : '',
      logoUrl: company.logoUrl ?? '',
    });
    setDialogOpen(true);
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر صورة بصيغة JPG أو PNG أو WebP',
          en: 'Choose a JPG, PNG, or WebP image',
        }),
      );
      event.target.value = '';
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'حجم الشعار يجب ألا يتجاوز 2 ميجابايت',
          en: 'Logo size must not exceed 2 MB',
        }),
      );
      event.target.value = '';
      return;
    }

    try {
      const compressed = await compressImage(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800 });
      const logoUrl = await readFileAsDataUrl(
        compressed,
        pickLocalizedCopy(appLanguage, {
          ar: 'تعذر قراءة الشعار',
          en: 'Could not read the logo file',
        }),
      );
      setForm((prev) => ({ ...prev, logoUrl }));
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم رفع الشعار وسيظهر بعد الحفظ',
          en: 'Logo uploaded and will appear after saving',
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر معالجة الشعار',
              en: 'Could not process the logo',
            }),
      );
    } finally {
      event.target.value = '';
    }
  };

  const refreshCompanies = () => {
    void queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });
  };

  const handleSaveCompany = async () => {
    if (!form.nameAr.trim()) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اسم الشركة مطلوب',
          en: 'Company name is required',
        }),
      );
      return;
    }

    if (!form.district) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر المنطقة',
          en: 'Select a district',
        }),
      );
      return;
    }

    if (form.bookingLink.trim() && !/^https?:\/\//i.test(form.bookingLink.trim())) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'رابط الحجز يجب أن يبدأ بـ http:// أو https://',
          en: 'Booking link must start with http:// or https://',
        }),
      );
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

      refreshCompanies();
      setDialogOpen(false);
      setForm(emptyTransportForm);
      toast.success(
        form.id
          ? pickLocalizedCopy(appLanguage, {
              ar: 'تم تحديث شركة النقل',
              en: 'Transport company updated',
            })
          : pickLocalizedCopy(appLanguage, {
              ar: 'تمت إضافة شركة النقل',
              en: 'Transport company added',
            }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر حفظ شركة النقل',
              en: 'Could not save the transport company',
            });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (
      !window.confirm(
        pickLocalizedCopy(appLanguage, {
          ar: 'هل تريد حذف شركة النقل هذه؟',
          en: 'Do you want to delete this transport company?',
        }),
      )
    ) {
      return;
    }

    try {
      await businessesAPI.remove(companyId);
      refreshCompanies();
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم حذف شركة النقل',
          en: 'Transport company deleted',
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : pickLocalizedCopy(appLanguage, {
              ar: 'تعذر حذف شركة النقل',
              en: 'Could not delete the transport company',
            });
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'شركات النقل المحلي',
              en: 'Local transport companies',
            })}
          </h3>
          <p className="text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'دليل شركات النقل والحافلات داخل الوادي الجديد مع روابط الحجز وبيانات التواصل.',
              en: 'Directory of transport and bus companies across New Valley with booking links and contact details.',
            })}
          </p>
        </div>
        {canManageCompanies && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'إضافة شركة نقل',
              en: 'Add transport company',
            })}
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
            <p className="text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد شركات نقل محلية مسجلة حالياً.',
                en: 'No local transport companies are listed yet.',
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.id} className="rounded-2xl border-border/60">
              <CardContent className="space-y-4 p-6">
                {(() => {
                  const companyName = pickLocalizedField(appLanguage, {
                    ar: company.nameAr,
                    en: company.nameEn,
                  });
                  const generalInfo =
                    appLanguage === 'ar'
                      ? (company.descriptionAr?.trim() ?? company.description?.trim() ?? '')
                      : '';

                  return (
                    <>
                      <div className="flex items-start gap-4">
                        <BusinessLogo
                          src={company.logoUrl}
                          alt={companyName}
                          fallbackIcon={Bus}
                          className="h-16 w-16 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-bold text-foreground">{companyName}</h4>
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{districtLabel(company.district ?? '', appLanguage)}</span>
                          </div>
                        </div>
                      </div>

                      {company.description && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'المقر',
                              en: 'Headquarters',
                            })}
                          </p>
                          <p className="text-sm text-foreground">{company.description}</p>
                        </div>
                      )}

                      {generalInfo && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'نبذة عامة',
                              en: 'General information',
                            })}
                          </p>
                          <p className="text-sm text-foreground">{generalInfo}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        {company.phone && (
                          <Button asChild variant="outline" className="flex-1">
                            <a href={`tel:${company.phone}`}>
                              <Phone className="ms-2 h-4 w-4" />
                              <LtrText>{company.phone}</LtrText>
                            </a>
                          </Button>
                        )}
                        {company.website && (
                          <Button asChild className="flex-1">
                            <a href={company.website} target="_blank" rel="noreferrer">
                              <ExternalLink className="ms-2 h-4 w-4" />
                              {pickLocalizedCopy(appLanguage, {
                                ar: 'رابط الحجز',
                                en: 'Booking link',
                              })}
                            </a>
                          </Button>
                        )}
                      </div>

                      {canManageCompanies && (
                        <div className="flex gap-2 border-t pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(company)}
                          >
                            <Pencil className="ms-2 h-4 w-4" />
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'تعديل',
                              en: 'Edit',
                            })}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDeleteCompany(company.id)}
                          >
                            <Trash2 className="ms-2 h-4 w-4" />
                            {pickLocalizedCopy(appLanguage, {
                              ar: 'حذف',
                              en: 'Delete',
                            })}
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
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
            <DialogTitle>
              {form.id
                ? pickLocalizedCopy(appLanguage, {
                    ar: 'تعديل شركة النقل',
                    en: 'Edit transport company',
                  })
                : pickLocalizedCopy(appLanguage, {
                    ar: 'إضافة شركة نقل',
                    en: 'Add transport company',
                  })}
            </DialogTitle>
            <DialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'أضف بيانات الحجز والتواصل والشعار لتظهر مباشرة داخل تبويب النقل المحلي.',
                en: 'Add booking details, contact information, and a logo so the company appears directly in the local transport tab.',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transportName">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'اسم الشركة',
                  en: 'Company name',
                })}
              </Label>
              <Input
                id="transportName"
                value={form.nameAr}
                onChange={(event) => updateField('nameAr', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}</Label>
              <Select
                value={form.district}
                onValueChange={(value) => updateField('district', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="transportHeadquarters">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'المقر',
                  en: 'Headquarters',
                })}
              </Label>
              <Input
                id="transportHeadquarters"
                value={form.headquarters}
                onChange={(event) => updateField('headquarters', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportBooking">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'رابط الحجز',
                  en: 'Booking link',
                })}
              </Label>
              <Input
                id="transportBooking"
                value={form.bookingLink}
                onChange={(event) => updateField('bookingLink', event.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportContact">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'بيانات التواصل',
                  en: 'Contact information',
                })}
              </Label>
              <Input
                id="transportContact"
                value={form.contactInfo}
                onChange={(event) => updateField('contactInfo', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transportInfo">
              {pickLocalizedCopy(appLanguage, {
                ar: 'معلومات عامة',
                en: 'General information',
              })}
            </Label>
            <Textarea
              id="transportInfo"
              rows={4}
              value={form.generalInfo}
              onChange={(event) => updateField('generalInfo', event.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{pickLocalizedCopy(appLanguage, { ar: 'الشعار', en: 'Logo' })}</Label>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="ms-2 h-4 w-4" />
                {pickLocalizedCopy(appLanguage, {
                  ar: 'رفع الشعار',
                  en: 'Upload logo',
                })}
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
              <BusinessLogo
                src={form.logoUrl}
                alt={form.nameAr || 'logo'}
                fallbackIcon={Bus}
                className="h-28 w-28 border bg-muted/30"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'لم يتم رفع شعار بعد.',
                  en: 'No logo uploaded yet.',
                })}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
            </Button>
            <Button onClick={() => void handleSaveCompany()} disabled={saving}>
              {saving
                ? pickLocalizedCopy(appLanguage, {
                    ar: 'جارٍ الحفظ...',
                    en: 'Saving...',
                  })
                : form.id
                  ? pickLocalizedCopy(appLanguage, {
                      ar: 'تحديث الشركة',
                      en: 'Update company',
                    })
                  : pickLocalizedCopy(appLanguage, {
                      ar: 'إضافة الشركة',
                      en: 'Add company',
                    })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
