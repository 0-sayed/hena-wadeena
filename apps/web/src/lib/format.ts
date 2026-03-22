import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
export { piastresToEgp } from '@hena-wadeena/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format nullable rating to 1-decimal string, or '—' if missing */
export function formatRating(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : '—';
}

// ── Enum → Arabic label maps ────────────────────────────────────────────────

export type AttractionType = 'attraction' | 'historical' | 'natural' | 'festival' | 'adventure';
export type AttractionArea = 'kharga' | 'dakhla' | 'farafra' | 'baris' | 'balat';
export type BestSeason = 'winter' | 'summer' | 'spring' | 'all_year';
export type BestTimeOfDay = 'morning' | 'evening' | 'any';
export type Difficulty = 'easy' | 'moderate' | 'hard';

export const attractionTypeLabels: Record<AttractionType, string> = {
  attraction: 'معلم سياحي',
  historical: 'تاريخي',
  natural: 'طبيعي',
  festival: 'مهرجان',
  adventure: 'مغامرة',
};

export const areaLabels: Record<AttractionArea, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
};

export const bestSeasonLabels: Record<BestSeason, string> = {
  winter: 'الشتاء',
  summer: 'الصيف',
  spring: 'الربيع',
  all_year: 'طوال العام',
};

export const bestTimeOfDayLabels: Record<BestTimeOfDay, string> = {
  morning: 'الصباح',
  evening: 'المساء',
  any: 'أي وقت',
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: 'سهل',
  moderate: 'متوسط',
  hard: 'صعب',
};

export const languageLabels: Record<GuideLanguage, string> = {
  [GuideLanguage.ARABIC]: 'العربية',
  [GuideLanguage.ENGLISH]: 'الإنجليزية',
  [GuideLanguage.FRENCH]: 'الفرنسية',
  [GuideLanguage.GERMAN]: 'الألمانية',
  [GuideLanguage.ITALIAN]: 'الإيطالية',
};

export const specialtyLabels: Record<GuideSpecialty, string> = {
  [GuideSpecialty.HISTORY]: 'تاريخ',
  [GuideSpecialty.NATURE]: 'طبيعة',
  [GuideSpecialty.ADVENTURE]: 'مغامرة',
  [GuideSpecialty.CULTURE]: 'ثقافة',
  [GuideSpecialty.PHOTOGRAPHY]: 'تصوير',
  [GuideSpecialty.FOOD]: 'طعام',
};
