export interface AreaPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
}

export const AREA_PRESETS: AreaPreset[] = [
  { id: 'kharga', nameAr: 'الخارجة', nameEn: 'Al-Kharga', lat: 25.439, lng: 30.5503 },
  { id: 'dakhla', nameAr: 'الداخلة', nameEn: 'Al-Dakhla', lat: 25.4948, lng: 29.0009 },
  { id: 'farafra', nameAr: 'الفرافرة', nameEn: 'Al-Farafra', lat: 27.0567, lng: 27.9703 },
  { id: 'baris', nameAr: 'باريس', nameEn: 'Baris', lat: 24.75, lng: 30.6167 },
  { id: 'balat', nameAr: 'بلاط', nameEn: 'Balat', lat: 25.5667, lng: 29.2833 },
];

/** Find an area preset by its id */
export function findArea(id: string): AreaPreset | undefined {
  return AREA_PRESETS.find((a) => a.id === id);
}
