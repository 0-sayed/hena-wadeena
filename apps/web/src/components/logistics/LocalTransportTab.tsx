import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@hena-wadeena/types';
import { Bus, ExternalLink, MapPin, Pencil, Phone, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { BusinessLogo } from '@/components/business/BusinessLogo';
import { useBusinesses } from '@/hooks/use-businesses';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { businessesAPI } from '@/services/api';

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

function readFileAsDataUrl(file: File, errorMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error(errorMessage));
    };
    reader.onerror = () => reject(new Error(errorMessage));
    reader.readAsDataURL(file);
  });
}

export function LocalTransportTab() {
  const { t } = useTranslation(['logistics', 'common']);
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
      generalInfo: appLanguage === 'ar' ? company.descriptionAr ?? '' : '',
      logoUrl: company.logoUrl ?? '',
    });
    setDialogOpen(true);
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('transport.toast.imageType'));
      event.target.value = '';
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast.error(t('transport.toast.imageSize'));
      event.target.value = '';
      return;
    }

    try {
      const logoUrl = await readFileAsDataUrl(
        file,
        t('transport.toast.readError'),
      );
      setForm((prev) => ({ ...prev, logoUrl }));
      toast.success(t('transport.toast.uploaded'));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('transport.toast.readError');
      toast.error(message);
    } finally {
      event.target.value = '';
    }
  };

  const refreshCompanies = () => {
    void queryClient.invalidateQueries({ queryKey: ['market', 'businesses'] });
  };

  const handleSaveCompany = async () => {
    if (!form.nameAr.trim()) {
      toast.error(t('transport.toast.nameReq'));
      return;
    }

    if (!form.district) {
      toast.error(t('transport.toast.districtReq'));
      return;
    }

    if (form.bookingLink.trim() && !/^https?:\/\//i.test(form.bookingLink.trim())) {
      toast.error(t('transport.toast.linkInvalid'));
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
          ? t('transport.toast.updated')
          : t('transport.toast.added'),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('transport.toast.saveError');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (
      !window.confirm(t('transport.toast.deleteConfirm'))
    ) {
      return;
    }

    try {
      await businessesAPI.remove(companyId);
      refreshCompanies();
      toast.success(t('transport.toast.deleted'));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('transport.toast.deleteError');
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            {t('transport.title')}
          </h3>
          <p className="text-muted-foreground">
            {t('transport.desc')}
          </p>
        </div>
        {canManageCompanies && (
          <Button onClick={openCreateDialog}>
            <Plus className="ms-2 h-4 w-4" />
            {t('transport.addBtn')}
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
              {t('transport.empty')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {companies.map((company) => (
            <Card key={company.id} className="rounded-2xl border-border/60">
              <CardContent className="space-y-4 p-6">
                {(() => {
                  const companyName = (appLanguage === 'en' ? company.nameEn : company.nameAr) ?? company.nameAr ?? '';
                  const generalInfo =
                    appLanguage === 'ar'
                      ? company.descriptionAr?.trim() ?? company.description?.trim() ?? ''
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
                      {t('transport.headquarters')}
                    </p>
                    <p className="text-sm text-foreground">{company.description}</p>
                  </div>
                )}

                {generalInfo && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t('transport.generalInfo')}
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
                        {t('transport.bookingLink')}
                      </a>
                    </Button>
                  )}
                </div>

                {canManageCompanies && (
                  <div className="flex gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(company)}>
                      <Pencil className="ms-2 h-4 w-4" />
                      {t('transport.edit')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDeleteCompany(company.id)}
                    >
                      <Trash2 className="ms-2 h-4 w-4" />
                      {t('transport.delete')}
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
                ? t('transport.dialog.titleEdit')
                : t('transport.dialog.titleAdd')}
            </DialogTitle>
            <DialogDescription>
              {t('transport.dialog.desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transportName">
                {t('transport.form.name')}
              </Label>
              <Input
                id="transportName"
                value={form.nameAr}
                onChange={(event) => updateField('nameAr', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('transport.form.district')}</Label>
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
                {t('transport.headquarters')}
              </Label>
              <Input
                id="transportHeadquarters"
                value={form.headquarters}
                onChange={(event) => updateField('headquarters', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportBooking">
                {t('transport.bookingLink')}
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
                {t('transport.form.contact')}
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
              {t('transport.generalInfo')}
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
              <Label>{t('transport.form.logo')}</Label>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="ms-2 h-4 w-4" />
                {t('transport.form.uploadLogo')}
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
                {t('transport.form.noLogo')}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('common:cancelBtn')}
            </Button>
            <Button onClick={() => void handleSaveCompany()} disabled={saving}>
              {saving
                ? t('common:roleCrud.saveBtn', { defaultValue: 'Saving...' }) 
                : form.id
                  ? t('transport.form.updateBtn')
                  : t('transport.form.addBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
