/** Generate a URL-safe slug from an Arabic or English string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s-]+/g, '-') // collapse whitespace and hyphens in one pass
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}
