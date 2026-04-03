const arabicDiacriticsRegex =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;

export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(arabicDiacriticsRegex, '')
    .replace(/\s+/g, ' ');
}

export function matchesSearchQuery(
  query: string,
  candidates: Array<string | null | undefined>,
): boolean {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  const normalizedCandidates = candidates.map((candidate) => normalizeSearchText(candidate));
  return tokens.every((token) =>
    normalizedCandidates.some((candidate) => candidate.includes(token)),
  );
}
