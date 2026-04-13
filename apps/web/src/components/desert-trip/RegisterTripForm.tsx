import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useRegisterDesertTrip } from '@/hooks/use-desert-trip';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import { ApiError } from '@/services/api';
import type { RegisterDesertTripRequest } from '@/services/api';

interface RegisterTripFormProps {
  bookingId: string;
  language: AppLanguage;
}

export function RegisterTripForm({ bookingId, language }: RegisterTripFormProps) {
  const [form, setForm] = useState({
    destinationName: '',
    emergencyContact: '',
    expectedArrivalAt: '',
    rangerStationName: '',
  });

  const mutation = useRegisterDesertTrip();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const body: RegisterDesertTripRequest = {
      destinationName: form.destinationName.trim(),
      emergencyContact: form.emergencyContact.trim(),
      expectedArrivalAt: new Date(form.expectedArrivalAt).toISOString(),
      ...(form.rangerStationName.trim()
        ? { rangerStationName: form.rangerStationName.trim() }
        : {}),
    };

    mutation.mutate(
      { bookingId, body },
      {
        onSuccess: () => {
          toast.success(
            pickLocalizedCopy(language, { ar: 'تم تسجيل خطة الرحلة', en: 'Trip plan registered' }),
          );
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            toast.error(
              pickLocalizedCopy(language, {
                ar: 'خطة الرحلة موجودة بالفعل',
                en: 'Trip plan already exists',
              }),
            );
          } else {
            toast.error(error instanceof Error ? error.message : String(error));
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border bg-muted/20 p-4">
      <p className="text-sm font-semibold">
        {pickLocalizedCopy(language, {
          ar: 'تسجيل خطة الرحلة الصحراوية',
          en: 'Register Desert Trip Plan',
        })}
      </p>

      <div className="space-y-2">
        <Label htmlFor={`dest-${bookingId}`}>
          {pickLocalizedCopy(language, { ar: 'اسم الوجهة *', en: 'Destination *' })}
        </Label>
        <Input
          id={`dest-${bookingId}`}
          value={form.destinationName}
          onChange={(e) => setForm((prev) => ({ ...prev, destinationName: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`ec-${bookingId}`}>
          {pickLocalizedCopy(language, { ar: 'جهة الطوارئ *', en: 'Emergency Contact *' })}
        </Label>
        <Input
          id={`ec-${bookingId}`}
          value={form.emergencyContact}
          onChange={(e) => setForm((prev) => ({ ...prev, emergencyContact: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`arrival-${bookingId}`}>
          {pickLocalizedCopy(language, { ar: 'وقت الوصول المتوقع *', en: 'Expected Arrival *' })}
        </Label>
        <Input
          id={`arrival-${bookingId}`}
          type="datetime-local"
          value={form.expectedArrivalAt}
          onChange={(e) => setForm((prev) => ({ ...prev, expectedArrivalAt: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`ranger-${bookingId}`}>
            {pickLocalizedCopy(language, {
              ar: 'أقرب نقطة حراسة',
              en: 'Nearest Ranger Post',
            })}
          </Label>
          <Tooltip delayDuration={0}>
            <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground">
              <CircleHelp className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent className="max-w-60 text-center">
              {pickLocalizedCopy(language, {
                ar: 'نقاط الحراسة هي مراكز حراس المحميات الطبيعية المنتشرة في الصحراء. تُستخدم للتواصل معهم في حالات الطوارئ إذا تأخّر المرشد عن موعد الوصول.',
                en: 'Ranger posts are staffed desert protectorate outposts. If the guide misses their expected arrival, the nearest post can dispatch a patrol.',
              })}
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          id={`ranger-${bookingId}`}
          value={form.rangerStationName}
          onChange={(e) => setForm((prev) => ({ ...prev, rangerStationName: e.target.value }))}
          placeholder={pickLocalizedCopy(language, {
            ar: 'مثال: نقطة حراسة الخارجة',
            en: 'e.g. Al-Kharga Guard Post',
          })}
        />
        <p className="text-xs text-muted-foreground">
          {pickLocalizedCopy(language, {
            ar: 'اختياري — اسم أقرب نقطة حراسة على مسار الرحلة',
            en: 'Optional — name of the nearest ranger post along your route',
          })}
        </p>
      </div>

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending
          ? pickLocalizedCopy(language, { ar: 'جارٍ التسجيل...', en: 'Registering...' })
          : pickLocalizedCopy(language, { ar: 'تسجيل خطة الرحلة', en: 'Register Trip Plan' })}
      </Button>
    </form>
  );
}
