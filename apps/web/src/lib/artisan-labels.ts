import { ARTISAN_AREAS, CRAFT_TYPES } from '@hena-wadeena/types';

export const craftTypeLabels: Record<string, string> = {
  palm_leaf: 'سعف النخيل',
  pottery: 'الفخار',
  kilim: 'الكليم',
  embroidery: 'التطريز',
  other: 'أخرى',
};

export const areaLabels: Record<string, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
};

export const areaOptions = [
  { value: 'all', label: 'جميع المناطق' },
  ...ARTISAN_AREAS.map((a) => ({ value: a, label: areaLabels[a] ?? a })),
];

export const craftTypeOptions = [
  { value: 'all', label: 'جميع الحرف' },
  ...CRAFT_TYPES.map((c) => ({ value: c, label: craftTypeLabels[c] ?? c })),
];
