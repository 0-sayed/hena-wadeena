export type AppLanguage = 'ar' | 'en';

export function pickLocalizedCopy(
  language: AppLanguage,
  copy: { ar: string; en: string },
): string {
  return language === 'en' ? copy.en : copy.ar;
}

export function pickLocalizedField(
  language: AppLanguage,
  values: { ar?: string | null; en?: string | null },
): string {
  const arabic = values.ar?.trim();
  const english = values.en?.trim();

  return language === 'en' ? english ?? arabic ?? '' : arabic ?? english ?? '';
}
