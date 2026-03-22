import type { NvDistrict, CommodityCategory, CommodityUnit } from '@hena-wadeena/types';

/** Convert piasters (integer) to formatted EGP string */
export function formatPrice(piasters: number): string {
  const egp = piasters / 100;
  return egp.toLocaleString('ar-u-nu-latn', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

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
