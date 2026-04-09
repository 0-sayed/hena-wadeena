import type {
  CommodityCategory,
  CommodityUnit,
  ListingCategory,
  NvDistrict,
  PriceType,
  TransactionType,
} from '@hena-wadeena/types';
import { GuideLanguage, GuideSpecialty } from '@hena-wadeena/types';
export { piastresToEgp } from '@hena-wadeena/types';
import type { AppLanguage } from './localization';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert piasters (integer) to formatted EGP string */
export function formatPrice(piasters: number): string {
  const egp = piasters / 100;
  return egp.toLocaleString('ar-u-nu-latn', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Format a ride price in piasters with the currency label, returning free for zero */
export function formatRidePrice(piasters: number, language: AppLanguage = 'ar'): string {
  if (piasters === 0) {
    return language === 'en' ? 'Free' : 'مجاني';
  }

  const egp = piasters / 100;
  const locale = language === 'en' ? 'en-US' : 'ar-u-nu-latn';
  const label = language === 'en' ? 'EGP' : 'جنيه';

  return `${egp.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${label}`;
}

/** Format nullable rating to 1-decimal string, or '—' if missing */
export function formatRating(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : '—';
}

/** Format a year count with Arabic plural rules for "year". */
export function formatArabicYears(years: number): string {
  const category = new Intl.PluralRules('ar').select(Math.abs(years));

  const label =
    category === 'one'
      ? 'سنة'
      : category === 'two'
        ? 'سنتان'
        : category === 'few'
          ? 'سنوات'
          : category === 'zero'
            ? 'سنوات'
            : 'سنة';

  return `${years} ${label}`;
}

export function formatArabicSeats(slots: number): string {
  const absSlots = Math.abs(slots);
  const category = new Intl.PluralRules('ar').select(absSlots);

  if (absSlots === 1) {
    return 'مقعد واحد';
  }
  if (absSlots === 2) {
    return 'مقعدان';
  }

  const label = category === 'few' || category === 'zero' ? 'مقاعد' : 'مقعد';
  return `${slots} ${label}`;
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

const districtLabelsEn: Record<NvDistrict, string> = {
  kharga: 'Kharga',
  dakhla: 'Dakhla',
  farafra: 'Farafra',
  baris: 'Baris',
  balat: 'Balat',
};

export function districtLabel(district: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? districtLabelsEn : districtLabels;
  return labels[district as NvDistrict] ?? district;
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

const categoryLabelsEn: Record<CommodityCategory, string> = {
  fruits: 'Fruits',
  grains: 'Grains',
  vegetables: 'Vegetables',
  oils: 'Oils',
  livestock: 'Livestock',
  other: 'Other',
};

export function categoryLabel(category: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? categoryLabelsEn : categoryLabels;
  return labels[category as CommodityCategory] ?? category;
}

export const listingCategoryLabels: Record<ListingCategory, string> = {
  place: 'مكان',
  accommodation: 'إقامة',
  restaurant: 'مطعم',
  service: 'خدمة',
  activity: 'نشاط',
  transport: 'نقل',
  education: 'تعليم',
  healthcare: 'رعاية صحية',
  shopping: 'تسوق',
  agricultural_produce: 'منتجات زراعية',
};

const listingCategoryLabelsEn: Record<ListingCategory, string> = {
  place: 'Place',
  accommodation: 'Accommodation',
  restaurant: 'Restaurant',
  service: 'Service',
  activity: 'Activity',
  transport: 'Transport',
  education: 'Education',
  healthcare: 'Healthcare',
  shopping: 'Shopping',
  agricultural_produce: 'Agricultural Produce',
};

export function listingCategoryLabel(category: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? listingCategoryLabelsEn : listingCategoryLabels;
  return labels[category as ListingCategory] ?? category;
}

export const transactionLabels: Record<TransactionType, string> = {
  sale: 'للبيع',
  rent: 'للإيجار',
};

const transactionLabelsEn: Record<TransactionType, string> = {
  sale: 'For sale',
  rent: 'Rent',
};

export function transactionLabel(transaction: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? transactionLabelsEn : transactionLabels;
  return labels[transaction as TransactionType] ?? transaction;
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

const unitLabelsEn: Record<CommodityUnit, string> = {
  kg: 'kg',
  ton: 'ton',
  ardeb: 'ardeb',
  kantar: 'qintar',
  liter: 'L',
  piece: 'piece',
  box: 'box',
};

export function unitLabel(unit: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? unitLabelsEn : unitLabels;
  return labels[unit as CommodityUnit] ?? unit;
}

export const priceTypeLabels: Record<PriceType, string> = {
  retail: 'تجزئة',
  wholesale: 'جملة',
  farm_gate: 'بوابة المزرعة',
};

const priceTypeLabelsEn: Record<PriceType, string> = {
  retail: 'Retail',
  wholesale: 'Wholesale',
  farm_gate: 'Farm gate',
};

export function priceTypeLabel(type: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? priceTypeLabelsEn : priceTypeLabels;
  return labels[type as PriceType] ?? type;
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

const attractionTypeLabelsEn: Record<AttractionType, string> = {
  attraction: 'Attraction',
  historical: 'Historical',
  natural: 'Natural',
  festival: 'Festival',
  adventure: 'Adventure',
};

export function attractionTypeLabel(type: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? attractionTypeLabelsEn : attractionTypeLabels;
  return labels[type as AttractionType] ?? type;
}

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

export const languageLabels: Record<string, string> = {
  [GuideLanguage.ARABIC]: 'العربية',
  [GuideLanguage.ENGLISH]: 'الإنجليزية',
  [GuideLanguage.FRENCH]: 'الفرنسية',
  [GuideLanguage.GERMAN]: 'الألمانية',
  [GuideLanguage.ITALIAN]: 'الإيطالية',
  ar: 'العربية',
  en: 'الإنجليزية',
  fr: 'الفرنسية',
  de: 'الألمانية',
  it: 'الإيطالية',
};

const languageLabelsEn: Record<string, string> = {
  [GuideLanguage.ARABIC]: 'Arabic',
  [GuideLanguage.ENGLISH]: 'English',
  [GuideLanguage.FRENCH]: 'French',
  [GuideLanguage.GERMAN]: 'German',
  [GuideLanguage.ITALIAN]: 'Italian',
  ar: 'Arabic',
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
};

export function languageLabel(value: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? languageLabelsEn : languageLabels;
  return labels[value] ?? value;
}

export const specialtyLabels: Record<string, string> = {
  [GuideSpecialty.HISTORY]: 'تاريخ',
  [GuideSpecialty.NATURE]: 'طبيعة',
  [GuideSpecialty.ADVENTURE]: 'مغامرة',
  [GuideSpecialty.CULTURE]: 'ثقافة',
  [GuideSpecialty.PHOTOGRAPHY]: 'تصوير',
  [GuideSpecialty.FOOD]: 'طعام',
  archaeology: 'آثار',
  temples: 'معابد',
  desert: 'صحراء',
  camping: 'تخييم',
  safari: 'سفاري',
  sandboarding: 'تزلج رملي',
  wellness: 'استشفاء',
  hot_springs: 'ينابيع حارة',
  medical_tourism: 'سياحة علاجية',
  landscapes: 'مناظر طبيعية',
  architecture: 'عمارة',
};

const specialtyLabelsEn: Record<string, string> = {
  [GuideSpecialty.HISTORY]: 'History',
  [GuideSpecialty.NATURE]: 'Nature',
  [GuideSpecialty.ADVENTURE]: 'Adventure',
  [GuideSpecialty.CULTURE]: 'Culture',
  [GuideSpecialty.PHOTOGRAPHY]: 'Photography',
  [GuideSpecialty.FOOD]: 'Food',
  archaeology: 'Archaeology',
  temples: 'Temples',
  desert: 'Desert',
  camping: 'Camping',
  safari: 'Safari',
  sandboarding: 'Sandboarding',
  wellness: 'Wellness',
  hot_springs: 'Hot springs',
  medical_tourism: 'Medical tourism',
  landscapes: 'Landscapes',
  architecture: 'Architecture',
};

export function specialtyLabel(value: string, language: AppLanguage = 'ar'): string {
  const labels = language === 'en' ? specialtyLabelsEn : specialtyLabels;
  return labels[value] ?? value;
}

// ── Job Board label maps ────────────────────────────────────────────────────

export type JobCategory =
  | 'agriculture'
  | 'tourism'
  | 'skilled_trade'
  | 'domestic'
  | 'logistics'
  | 'handicraft';
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'in_progress'
  | 'completed';
export type CompensationType = 'fixed' | 'daily' | 'per_kg' | 'negotiable';

const jobCategoryLabels: Record<JobCategory, string> = {
  agriculture: 'زراعة',
  tourism: 'سياحة',
  skilled_trade: 'حرفة',
  domestic: 'خدمات منزلية',
  logistics: 'لوجستيات',
  handicraft: 'صناعة يدوية',
};

export function jobCategoryLabel(category: string): string {
  return jobCategoryLabels[category as JobCategory] ?? category;
}

/** Select options for category — form use (no "all" entry) */
export const JOB_CATEGORY_OPTIONS: { id: JobCategory; label: string }[] = Object.entries(
  jobCategoryLabels,
).map(([id, label]) => ({ id: id as JobCategory, label }));

/** Select options for category filter — first entry is "all" */
export const JOB_CATEGORY_OPTIONS_WITH_ALL: { id: JobCategory | undefined; label: string }[] = [
  { id: undefined, label: 'الكل' },
  ...JOB_CATEGORY_OPTIONS,
];

const jobStatusLabels: Record<JobStatus, string> = {
  open: 'مفتوح',
  in_progress: 'جارٍ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  expired: 'منتهي',
};

export function jobStatusLabel(status: string): string {
  return jobStatusLabels[status as JobStatus] ?? status;
}

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  withdrawn: 'منسحب',
  in_progress: 'جارٍ',
  completed: 'مكتمل',
};

export function applicationStatusLabel(status: string): string {
  return applicationStatusLabels[status as ApplicationStatus] ?? status;
}

const compensationTypeLabels: Record<CompensationType, string> = {
  fixed: 'مبلغ ثابت',
  daily: 'يومي',
  per_kg: 'بالكيلو',
  negotiable: 'قابل للتفاوض',
};

export function compensationTypeLabel(type: string): string {
  return compensationTypeLabels[type as CompensationType] ?? type;
}

/** Select options for compensation type — form use (no "all" entry) */
export const COMPENSATION_TYPE_OPTIONS: { id: CompensationType; label: string }[] = Object.entries(
  compensationTypeLabels,
).map(([id, label]) => ({ id: id as CompensationType, label }));

/** Select options for compensation type filter — first entry is "all" */
export const COMPENSATION_TYPE_OPTIONS_WITH_ALL: {
  id: CompensationType | undefined;
  label: string;
}[] = [{ id: undefined, label: 'الكل' }, ...COMPENSATION_TYPE_OPTIONS];
