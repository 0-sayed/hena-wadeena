import { Badge } from '@/components/ui/badge';
import { formatDateTimeShort } from '@/lib/dates';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import type { DesertTrip } from '@/services/api';

const STATUS_BADGE_CLASS: Record<DesertTrip['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  checked_in: 'bg-green-500 text-white',
  overdue: 'bg-amber-500 text-white',
  alert_sent: 'bg-red-500 text-white',
  resolved: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<DesertTrip['status'], { ar: string; en: string }> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  checked_in: { ar: 'تم تسجيل الوصول', en: 'Checked In' },
  overdue: { ar: 'متأخر', en: 'Overdue' },
  alert_sent: { ar: 'تم إرسال التنبيه', en: 'Alert Sent' },
  resolved: { ar: 'تم الحل', en: 'Resolved' },
};

function statusLabel(status: DesertTrip['status'], language: AppLanguage): string {
  return pickLocalizedCopy(language, STATUS_LABELS[status]);
}

interface TripStatusCardProps {
  trip: DesertTrip;
  language: AppLanguage;
}

export function TripStatusCard({ trip, language }: TripStatusCardProps) {
  return (
    <div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {pickLocalizedCopy(language, { ar: 'خطة رحلة صحراوية', en: 'Desert Trip Plan' })}
        </span>
        <Badge className={STATUS_BADGE_CLASS[trip.status]}>
          {statusLabel(trip.status, language)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">
            {pickLocalizedCopy(language, { ar: 'الوجهة', en: 'Destination' })}
          </p>
          <p className="font-medium">{trip.destinationName}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {pickLocalizedCopy(language, { ar: 'وقت الوصول المتوقع', en: 'Expected Arrival' })}
          </p>
          <p className="font-medium">{formatDateTimeShort(trip.expectedArrivalAt, language)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">
            {pickLocalizedCopy(language, { ar: 'جهة الطوارئ', en: 'Emergency Contact' })}
          </p>
          <p className="font-medium">{trip.emergencyContact}</p>
        </div>
        {trip.rangerStationName && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">
              {pickLocalizedCopy(language, { ar: 'نقطة الحراسة', en: 'Ranger Post' })}
            </p>
            <p className="font-medium">{trip.rangerStationName}</p>
          </div>
        )}
        {trip.checkedInAt && (
          <div>
            <p className="text-muted-foreground text-xs">
              {pickLocalizedCopy(language, { ar: 'وقت تسجيل الوصول', en: 'Checked In At' })}
            </p>
            <p className="font-medium text-green-600">
              {formatDateTimeShort(trip.checkedInAt, language)}
            </p>
          </div>
        )}
        {trip.alertTriggeredAt && (
          <div className="col-span-2">
            <p className="text-xs text-red-500">
              {pickLocalizedCopy(language, { ar: 'وقت إرسال التنبيه', en: 'Alert Triggered At' })}
            </p>
            <p className="font-medium text-red-600">
              {formatDateTimeShort(trip.alertTriggeredAt, language)}
            </p>
          </div>
        )}
      </div>

      {(trip.status === 'overdue' || trip.status === 'alert_sent') && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          {trip.status === 'alert_sent'
            ? pickLocalizedCopy(language, {
                ar: 'تم إخطار السلطات. يرجى التحقق من سلامة المرشد.',
                en: 'Authorities have been notified. Please verify guide safety.',
              })
            : pickLocalizedCopy(language, {
                ar: 'تجاوز وقت الوصول المتوقع.',
                en: 'Expected arrival time has passed.',
              })}
        </p>
      )}
    </div>
  );
}
