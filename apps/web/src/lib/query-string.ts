/**
 * Builds a URL query string from a params object, omitting null/undefined values.
 */
export function toQueryString(params?: object): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}
