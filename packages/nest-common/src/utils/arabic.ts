/**
 * Normalizes Arabic text for consistent full-text search indexing and querying.
 * Mirrors the PostgreSQL `normalize_arabic()` function used in service schemas.
 *
 * Operations:
 * 1. Strip tashkeel (diacritics/vowel marks)
 * 2. Normalize alef variants (أ إ آ → ا)
 * 3. Convert teh marbuta (ة → ه)
 * 4. Remove tatweel/kashida (ـ)
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g,
      '',
    )
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '');
}

export function buildPrefixTsQuery(text: string): string | null {
  const tokens = normalizeArabic(text)
    .trim()
    .replace(/[&|!:()<>']/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return null;

  return tokens.map((token) => `${token}:*`).join(' & ');
}
