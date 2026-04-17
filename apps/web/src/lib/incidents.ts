import { IncidentStatus as SharedIncidentStatus } from '@hena-wadeena/types';

import type { AppLanguage } from '@/lib/localization';
import type { EnvironmentalIncident, IncidentStatus, IncidentType } from '@/services/api';

export const STATUS_LABELS: Record<IncidentStatus, { ar: string; en: string }> = {
  reported: { ar: 'مُبلَّغ', en: 'Reported' },
  under_review: { ar: 'قيد المراجعة', en: 'Under Review' },
  resolved: { ar: 'تم الحل', en: 'Resolved' },
  dismissed: { ar: 'مرفوض', en: 'Dismissed' },
};

export const STATUS_VARIANT: Record<
  IncidentStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  reported: 'default',
  under_review: 'secondary',
  resolved: 'outline',
  dismissed: 'destructive',
};

export const TYPE_LABELS: Record<IncidentType, { ar: string; en: string }> = {
  litter: { ar: 'نفايات', en: 'Litter' },
  illegal_dumping: { ar: 'إلقاء غير مشروع', en: 'Illegal Dumping' },
  vehicle_damage: { ar: 'أضرار مركبات', en: 'Vehicle Damage' },
  fire_remains: { ar: 'بقايا حرائق', en: 'Fire Remains' },
  vandalism: { ar: 'تخريب', en: 'Vandalism' },
};

export const ALL_STATUSES = Object.values(SharedIncidentStatus) as IncidentStatus[];

export function getIncidentDescription(
  incident: Pick<EnvironmentalIncident, 'descriptionAr' | 'descriptionEn'>,
  lang: AppLanguage,
): { text: string; dir: 'ltr' | 'rtl' } | null {
  if (lang === 'ar') {
    if (incident.descriptionAr) {
      return { text: incident.descriptionAr, dir: 'rtl' };
    }
    if (incident.descriptionEn) {
      return { text: incident.descriptionEn, dir: 'ltr' };
    }
    return null;
  }

  if (incident.descriptionEn) {
    return { text: incident.descriptionEn, dir: 'ltr' };
  }
  if (incident.descriptionAr) {
    return { text: incident.descriptionAr, dir: 'rtl' };
  }
  return null;
}

export function typeLabel(type: IncidentType, lang: AppLanguage): string {
  const t = TYPE_LABELS[type];
  return lang === 'en' ? t.en : t.ar;
}

export function statusLabel(status: IncidentStatus, lang: AppLanguage): string {
  const s = STATUS_LABELS[status];
  return lang === 'en' ? s.en : s.ar;
}
