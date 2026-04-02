import type { AppLanguage } from '@/lib/localization';

type BookingStatusPresentation = {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
};

const localizedBookingStatusLabels: Record<
  AppLanguage,
  Record<string, BookingStatusPresentation>
> = {
  ar: {
    pending: { label: 'بانتظار التأكيد', variant: 'secondary' },
    confirmed: { label: 'مؤكد', variant: 'default' },
    in_progress: { label: 'جارٍ', variant: 'default' },
    completed: { label: 'مكتمل', variant: 'outline' },
    cancelled: { label: 'ملغي', variant: 'destructive' },
  },
  en: {
    pending: { label: 'Pending approval', variant: 'secondary' },
    confirmed: { label: 'Confirmed booking', variant: 'default' },
    in_progress: { label: 'In progress', variant: 'default' },
    completed: { label: 'Completed', variant: 'outline' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  },
};

export const bookingStatusLabels = localizedBookingStatusLabels.ar;

export function getBookingStatusLabels(language: AppLanguage) {
  return localizedBookingStatusLabels[language];
}
