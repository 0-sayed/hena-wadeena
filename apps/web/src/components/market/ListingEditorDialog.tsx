import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { DISTRICTS, districtLabel } from '@/lib/format';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

const listingCategories = [
  { value: 'shopping', ar: 'تسوق', en: 'Shopping' },
  { value: 'service', ar: 'خدمات', en: 'Services' },
  { value: 'healthcare', ar: 'رعاية صحية', en: 'Healthcare' },
  { value: 'education', ar: 'تعليم', en: 'Education' },
] as const;

export type ListingFormState = {
  id?: string;
  titleAr: string;
  description: string;
  priceEgp: string;
  district: string;
  category: string;
  address: string;
};

export const emptyListingForm: ListingFormState = {
  titleAr: '',
  description: '',
  priceEgp: '',
  district: DISTRICTS[0]?.id ?? 'kharga',
  category: 'shopping',
  address: '',
};

type ListingEditorDialogProps = {
  appLanguage: AppLanguage;
  form: ListingFormState;
  open: boolean;
  saving: boolean;
  onFormChange: Dispatch<SetStateAction<ListingFormState>>;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export function ListingEditorDialog({
  appLanguage,
  form,
  open,
  saving,
  onFormChange,
  onOpenChange,
  onSave,
}: ListingEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {form.id
              ? pickLocalizedCopy(appLanguage, { ar: 'تعديل إعلان', en: 'Edit listing' })
              : pickLocalizedCopy(appLanguage, { ar: 'إضافة إعلان جديد', en: 'Add a new listing' })}
          </DialogTitle>
          <DialogDescription>
            {pickLocalizedCopy(appLanguage, {
              ar: 'أضف منتجاً أو خدمة مع السعر والموقع، ثم احفظ التغييرات لإظهارها في القائمة.',
              en: 'Add a product or service with pricing and location, then save to update the listings table.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="listingTitle">
              {pickLocalizedCopy(appLanguage, { ar: 'الاسم', en: 'Name' })}
            </Label>
            <Input
              id="listingTitle"
              value={form.titleAr}
              onChange={(event) =>
                onFormChange((prev) => ({ ...prev, titleAr: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="listingPrice">
                {pickLocalizedCopy(appLanguage, { ar: 'السعر (جنيه)', en: 'Price (EGP)' })}
              </Label>
              <Input
                id="listingPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.priceEgp}
                onChange={(event) =>
                  onFormChange((prev) => ({ ...prev, priceEgp: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>{pickLocalizedCopy(appLanguage, { ar: 'التصنيف', en: 'Category' })}</Label>
              <Select
                value={form.category}
                onValueChange={(value) => onFormChange((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {listingCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {pickLocalizedCopy(appLanguage, category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}</Label>
              <Select
                value={form.district}
                onValueChange={(value) => onFormChange((prev) => ({ ...prev, district: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {districtLabel(district.id, appLanguage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingAddress">
                {pickLocalizedCopy(appLanguage, { ar: 'العنوان', en: 'Address' })}
              </Label>
              <Input
                id="listingAddress"
                value={form.address}
                onChange={(event) =>
                  onFormChange((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="listingDescription">
              {pickLocalizedCopy(appLanguage, { ar: 'الوصف', en: 'Description' })}
            </Label>
            <Textarea
              id="listingDescription"
              rows={4}
              value={form.description}
              onChange={(event) =>
                onFormChange((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={onSave} disabled={saving}>
              {saving
                ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                : form.id
                  ? pickLocalizedCopy(appLanguage, { ar: 'تحديث الإعلان', en: 'Update listing' })
                  : pickLocalizedCopy(appLanguage, { ar: 'إضافة الإعلان', en: 'Add listing' })}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {pickLocalizedCopy(appLanguage, { ar: 'إغلاق', en: 'Close' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
