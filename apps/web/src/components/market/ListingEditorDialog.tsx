import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

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
import { type AppLanguage } from '@/lib/localization';
import { type ListingFormState } from './listing-editor-form';

const listingCategoryValues = ['shopping', 'service', 'healthcare', 'education'] as const;

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
  const { t } = useTranslation('market');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {form.id ? t('listingEditor.titleEdit') : t('listingEditor.titleAdd')}
          </DialogTitle>
          <DialogDescription>
            {t('listingEditor.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="listingTitle">
              {t('listingEditor.nameLabel')}
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
                {t('listingEditor.priceLabel')}
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
              <Label>{t('listingEditor.categoryLabel')}</Label>
              <Select
                value={form.category}
                onValueChange={(value) => onFormChange((prev) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {listingCategoryValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`categories.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('listingEditor.districtLabel')}</Label>
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
                {t('listingEditor.addressLabel')}
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
              {t('listingEditor.descriptionLabel')}
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
                ? t('listingEditor.saving')
                : form.id
                  ? t('listingEditor.updateBtn')
                  : t('listingEditor.addBtn')}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('listingEditor.closeBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
