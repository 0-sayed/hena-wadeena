import { useState } from 'react';
import { Droplets, DollarSign, Zap, Gauge, Plus, Sun, ExternalLink } from 'lucide-react';
import { egpToPiasters, NvDistrict } from '@hena-wadeena/types';
import { toast } from 'sonner';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { useAuth } from '@/hooks/use-auth';
import { useWellLogSummary, useCreateWellLog } from '@/hooks/use-well-logs';
import { districtLabel, formatPrice } from '@/lib/format';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

type LogFormState = {
  area: NvDistrict | undefined;
  logged_at: string;
  pump_hours: string;
  kwh_consumed: string;
  cost_egp: string;
  water_m3_est: string;
  depth_to_water_m: string;
};

function makeEmptyForm(): LogFormState {
  return {
    area: undefined,
    logged_at: new Date().toISOString().slice(0, 10),
    pump_hours: '',
    kwh_consumed: '',
    cost_egp: '',
    water_m3_est: '',
    depth_to_water_m: '',
  };
}

export default function FarmerDashboard() {
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data, isLoading, isError } = useWellLogSummary();
  const createWellLog = useCreateWellLog();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<LogFormState>(makeEmptyForm);

  const months = data?.months ?? [];
  const solar = data?.solar ?? null;
  const currentMonth = months[0];

  function handleFieldChange(field: keyof LogFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const area = form.area;
    if (!area) {
      return;
    }

    createWellLog.mutate(
      {
        area,
        logged_at: form.logged_at,
        pump_hours: parseFloat(form.pump_hours),
        kwh_consumed: parseFloat(form.kwh_consumed),
        cost_piasters: egpToPiasters(parseFloat(form.cost_egp)),
        water_m3_est: form.water_m3_est ? parseFloat(form.water_m3_est) : undefined,
        depth_to_water_m: form.depth_to_water_m ? parseFloat(form.depth_to_water_m) : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم حفظ القراءة بنجاح',
              en: 'Reading saved successfully',
            }),
          );
          setDialogOpen(false);
          setForm(makeEmptyForm());
        },
        onError: () => {
          toast.error(
            pickLocalizedCopy(appLanguage, {
              ar: 'حدث خطأ أثناء الحفظ',
              en: 'Failed to save reading',
            }),
          );
        },
      },
    );
  }

  const logReadingButton = (
    <Button onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      {pickLocalizedCopy(appLanguage, { ar: 'تسجيل قراءة', en: 'Log Reading' })}
    </Button>
  );

  return (
    <DashboardShell
      icon={Droplets}
      title={pickLocalizedCopy(appLanguage, { ar: 'لوحة تحكم المزارع', en: 'Farmer Dashboard' })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'تابع تكاليف مضخة مياه الآبار الجوفية',
        en: 'Track your groundwater well pump costs',
      })}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={pickLocalizedCopy(appLanguage, {
            ar: 'تكلفة الشهر الحالي (جنيه)',
            en: 'Current month cost (EGP)',
          })}
          value={
            isLoading
              ? '...'
              : currentMonth != null
                ? formatPrice(currentMonth.total_cost_piasters)
                : '—'
          }
          icon={DollarSign}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, {
            ar: 'كيلوواط ساعة هذا الشهر',
            en: 'Current month kWh',
          })}
          value={isLoading ? '...' : (currentMonth?.total_kwh ?? '—')}
          icon={Zap}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, {
            ar: 'متوسط عمق المياه (م)',
            en: 'Avg depth to water (m)',
          })}
          value={isLoading ? '...' : (currentMonth?.avg_depth_to_water_m ?? '—')}
          icon={Gauge}
        />
        <button
          type="button"
          className="block w-full cursor-pointer text-start"
          onClick={() => setDialogOpen(true)}
        >
          <StatCard
            label={pickLocalizedCopy(appLanguage, { ar: 'تسجيل قراءة', en: 'Log Reading' })}
            value={pickLocalizedCopy(appLanguage, { ar: 'أضف', en: 'Add' })}
            icon={Plus}
            variant="muted"
          />
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'تسجيل قراءة مضخة', en: 'Log Pump Reading' })}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area">
                {pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'Area' })}
              </Label>
              <Select
                value={form.area ?? ''}
                onValueChange={(value) => handleFieldChange('area', value)}
              >
                <SelectTrigger id="area">
                  <SelectValue
                    placeholder={pickLocalizedCopy(appLanguage, {
                      ar: 'اختر المنطقة',
                      en: 'Select area',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(NvDistrict).map((district) => (
                    <SelectItem key={district} value={district}>
                      {districtLabel(district, appLanguage)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logged_at">
                {pickLocalizedCopy(appLanguage, { ar: 'التاريخ', en: 'Date' })}
              </Label>
              <Input
                id="logged_at"
                type="date"
                value={form.logged_at}
                onChange={(e) => handleFieldChange('logged_at', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pump_hours">
                {pickLocalizedCopy(appLanguage, { ar: 'ساعات التشغيل', en: 'Pump hours' })}
              </Label>
              <Input
                id="pump_hours"
                type="number"
                step="0.1"
                min="0"
                value={form.pump_hours}
                onChange={(e) => handleFieldChange('pump_hours', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kwh_consumed">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'الطاقة المستهلكة (كيلوواط)',
                  en: 'kWh consumed',
                })}
              </Label>
              <Input
                id="kwh_consumed"
                type="number"
                step="0.01"
                min="0"
                value={form.kwh_consumed}
                onChange={(e) => handleFieldChange('kwh_consumed', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_egp">
                {pickLocalizedCopy(appLanguage, { ar: 'التكلفة (جنيه)', en: 'Cost (EGP)' })}
              </Label>
              <Input
                id="cost_egp"
                type="number"
                step="0.01"
                min="0"
                value={form.cost_egp}
                onChange={(e) => handleFieldChange('cost_egp', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="water_m3_est">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'كمية المياه المقدرة (م³) — اختياري',
                  en: 'Water estimate (m³) — optional',
                })}
              </Label>
              <Input
                id="water_m3_est"
                type="number"
                step="0.01"
                min="0"
                value={form.water_m3_est}
                onChange={(e) => handleFieldChange('water_m3_est', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depth_to_water_m">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'عمق المياه (م) — اختياري',
                  en: 'Depth to water (m) — optional',
                })}
              </Label>
              <Input
                id="depth_to_water_m"
                type="number"
                step="0.01"
                min="0"
                value={form.depth_to_water_m}
                onChange={(e) => handleFieldChange('depth_to_water_m', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createWellLog.isPending}>
                {createWellLog.isPending
                  ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ الحفظ...', en: 'Saving...' })
                  : pickLocalizedCopy(appLanguage, { ar: 'حفظ', en: 'Save' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'ملخص شهري', en: 'Monthly Summary' })}
            </CardTitle>
            {logReadingButton}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-muted-foreground">
              تعذّر تحميل بيانات البئر. يرجى المحاولة لاحقاً.
            </div>
          ) : months.length === 0 ? (
            <>
              <EmptyState
                icon={Droplets}
                message={pickLocalizedCopy(appLanguage, {
                  ar: 'سجّل أول جلسة ضخ',
                  en: 'Log your first pump session',
                })}
              />
              {logReadingButton}
            </>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'الشهر', en: 'Month' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'ساعات التشغيل', en: 'Pump Hours' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'كيلوواط ساعة', en: 'kWh' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'التكلفة (جنيه)', en: 'Cost (EGP)' })}
                  </TableHead>
                  <TableHead>
                    {pickLocalizedCopy(appLanguage, { ar: 'متوسط العمق (م)', en: 'Avg Depth (m)' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months.map((month) => (
                  <TableRow key={month.year_month}>
                    <TableCell>{month.year_month}</TableCell>
                    <TableCell>{month.total_pump_hours}</TableCell>
                    <TableCell>{month.total_kwh}</TableCell>
                    <TableCell>{formatPrice(month.total_cost_piasters)}</TableCell>
                    <TableCell>{month.avg_depth_to_water_m ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {solar !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              {pickLocalizedCopy(appLanguage, {
                ar: 'تقدير الطاقة الشمسية',
                en: 'Solar Estimator',
              })}
            </CardTitle>
            <CardDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'تقدير بناءً على بياناتك الأخيرة',
                en: 'Estimate based on your recent data',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'متوسط الاستهلاك الشهري (كيلوواط)',
                  en: 'Avg monthly kWh',
                })}
              </p>
              <p className="text-2xl font-bold">{solar.avg_monthly_kwh}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'متوسط التكلفة الشهرية (جنيه)',
                  en: 'Avg monthly cost (EGP)',
                })}
              </p>
              <p className="text-2xl font-bold">{formatPrice(solar.avg_monthly_cost_piasters)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'التوفير الشهري المقدر (جنيه)',
                  en: 'Est. monthly saving (EGP)',
                })}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(solar.estimated_monthly_saving_piasters)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'صافي تكلفة المزارع (جنيه)',
                  en: 'Farmer net cost (EGP)',
                })}
              </p>
              <p className="text-2xl font-bold">{formatPrice(solar.farmer_net_cost_piasters)}</p>
            </div>
            {solar.break_even_months !== null && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'فترة استرداد التكلفة (شهر)',
                    en: 'Break-even (months)',
                  })}
                </p>
                <p className="text-2xl font-bold">{solar.break_even_months}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <a
              href={solar.nrea_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {pickLocalizedCopy(appLanguage, { ar: 'المصدر: NREA', en: 'Source: NREA' })}
            </a>
          </CardFooter>
        </Card>
      )}
    </DashboardShell>
  );
}
