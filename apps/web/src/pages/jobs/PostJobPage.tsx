import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCreateJobMutation } from '@/hooks/use-jobs';
import {
  JOB_CATEGORY_OPTIONS,
  COMPENSATION_TYPE_OPTIONS,
  DISTRICTS,
  jobCategoryLabel,
  compensationTypeLabel,
  districtLabel,
} from '@/lib/format';
import { JobCategory, CompensationType } from '@/lib/format';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import type { AppLanguage } from '@/lib/localization';
import { parseCompensationToPiasters, parseSlots } from '@/pages/jobs/job-form.utils';

type FormState = {
  title: string;
  descriptionAr: string;
  descriptionEn: string;
  category: JobCategory;
  area: string;
  compensationEgp: string;
  compensationType: CompensationType;
  slots: string;
  startsAt: string;
  endsAt: string;
};

const empty: FormState = {
  title: '',
  descriptionAr: '',
  descriptionEn: '',
  category: JobCategory.AGRICULTURE,
  area: 'kharga',
  compensationEgp: '',
  compensationType: CompensationType.FIXED,
  slots: '1',
  startsAt: '',
  endsAt: '',
};

export default function PostJobPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('jobs');
  const { language } = useAuth();
  const appLanguage = language as AppLanguage;
  const [form, setForm] = useState<FormState>(empty);
  const createMutation = useCreateJobMutation();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const toIsoDateTime = (date: string) => `${date}T00:00:00.000Z`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error(t('errors.titleRequired'));
      return;
    }
    if (!form.descriptionAr.trim()) {
      toast.error(t('errors.descriptionArRequired'));
      return;
    }
    const compensation = parseCompensationToPiasters(form.compensationEgp);
    if (compensation === null) {
      toast.error(t('errors.compensationInvalid'));
      return;
    }
    const slots = parseSlots(form.slots);
    if (slots === null) {
      toast.error(t('errors.slotsInvalid'));
      return;
    }

    try {
      const job = await createMutation.mutateAsync({
        title: form.title.trim(),
        descriptionAr: form.descriptionAr.trim(),
        descriptionEn: form.descriptionEn.trim() || undefined,
        category: form.category,
        area: form.area,
        compensation,
        compensationType: form.compensationType,
        slots,
        startsAt: form.startsAt ? toIsoDateTime(form.startsAt) : undefined,
        endsAt: form.endsAt ? toIsoDateTime(form.endsAt) : undefined,
      });
      toast.success(t('postSuccess'));
      void navigate(`/jobs/${job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('postError'));
    }
  }

  return (
    <Layout title={t('postJobTitle')}>
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <h1 className="mb-8 text-2xl font-bold text-foreground">{t('postNewJobBtn')}</h1>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{t('jobDetailsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('jobTitleLabel')}</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder={t('jobTitlePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descriptionAr">{t('descArLabel')}</Label>
                  <Textarea
                    id="descriptionAr"
                    rows={4}
                    value={form.descriptionAr}
                    onChange={(e) => set('descriptionAr', e.target.value)}
                    placeholder={t('descArPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">{t('descEnLabel')}</Label>
                  <Textarea
                    id="descriptionEn"
                    rows={3}
                    value={form.descriptionEn}
                    onChange={(e) => set('descriptionEn', e.target.value)}
                    dir="ltr"
                    placeholder={t('descEnPlaceholder')}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('categoryLabel')}</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => set('category', v as JobCategory)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {jobCategoryLabel(opt.id, appLanguage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('areaLabel')}</Label>
                    <Select value={form.area} onValueChange={(v) => set('area', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {districtLabel(d.id, appLanguage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="compensation">
                      {t('compensationLabel', { currency: appLanguage === 'en' ? 'EGP' : 'جنيه' })}
                    </Label>
                    <Input
                      id="compensation"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.compensationEgp}
                      onChange={(e) => set('compensationEgp', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('compensationTypeLabel')}</Label>
                    <Select
                      value={form.compensationType}
                      onValueChange={(v) => set('compensationType', v as CompensationType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPENSATION_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {compensationTypeLabel(opt.id, appLanguage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slots">{t('slotsLabel')}</Label>
                  <Input
                    id="slots"
                    type="number"
                    min="1"
                    value={form.slots}
                    onChange={(e) => set('slots', e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startsAt">{t('startDateLabel')}</Label>
                    <Input
                      id="startsAt"
                      type="date"
                      value={form.startsAt}
                      onChange={(e) => set('startsAt', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endsAt">{t('endDateLabel')}</Label>
                    <Input
                      id="endsAt"
                      type="date"
                      value={form.endsAt}
                      onChange={(e) => set('endsAt', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('postingStatus') : t('postBtn')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={createMutation.isPending}
                onClick={() => void navigate('/jobs')}
              >
                {t('cancelBtn')}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
