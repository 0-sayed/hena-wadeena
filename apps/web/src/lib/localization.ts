export type AppLanguage = 'ar' | 'en';


export function pickLocalizedField(
  language: AppLanguage,
  values: { ar?: string | null; en?: string | null },
): string {
  const arabic = values.ar?.trim();
  const english = values.en?.trim();

  return language === 'en' ? english ?? arabic ?? '' : arabic ?? english ?? '';
}
