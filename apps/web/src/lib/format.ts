import type { NvDistrict, CommodityCategory, CommodityUnit } from '@hena-wadeena/types';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
export { piastresToEgp } from '@hena-wadeena/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert piasters (integer) to formatted EGP string */
export function formatPrice(piasters: number): string {
  const egp = piasters / 100;
  return egp.toLocaleString('ar-u-nu-latn', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Format a ride price in piasters with the "جنيه" label, returning "مجاني" for zero */
export function formatRidePrice(piasters: number): string {
  if (piasters === 0) return 'مجاني';
  return `${piasters} جنيه`;
}

/** Format nullable rating to 1-decimal string, or '—' if missing */
export function formatRating(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : '—';
}

// ── Enum → Arabic label maps ────────────────────────────────────────────────

/** District enum value → Arabic display name */
export const districtLabels: Record<NvDistrict, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
};

export function districtLabel(district: string): string {
  return districtLabels[district as NvDistrict] ?? district;
}

/** Select options derived from districtLabels */
export const DISTRICTS = Object.entries(districtLabels).map(([id, name]) => ({ id, name }));
export const DISTRICTS_WITH_ALL = [{ id: 'all', name: 'جميع المدن' }, ...DISTRICTS];

/** Commodity category enum → Arabic display name */
export const categoryLabels: Record<CommodityCategory, string> = {
  fruits: 'فواكه',
  grains: 'حبوب',
  vegetables: 'خضروات',
  oils: 'زيوت',
  livestock: 'مواشي',
  other: 'أخرى',
};

export function categoryLabel(category: string): string {
  return categoryLabels[category as CommodityCategory] ?? category;
}

/** Select options derived from categoryLabels — first entry is "all" with undefined id */
export const CATEGORY_OPTIONS: { id: string | undefined; label: string }[] = [
  { id: undefined, label: 'الكل' },
  ...Object.entries(categoryLabels).map(([id, label]) => ({ id, label })),
];

/** Commodity unit enum → Arabic display name */
export const unitLabels: Record<CommodityUnit, string> = {
  kg: 'كجم',
  ton: 'طن',
  ardeb: 'أردب',
  kantar: 'قنطار',
  liter: 'لتر',
  piece: 'قطعة',
  box: 'صندوق',
};

export function unitLabel(unit: string): string {
  return unitLabels[unit as CommodityUnit] ?? unit;
}

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
