/** Generate a URL-safe slug from an Arabic or English string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u0621-\u064A\u0660-\u0669]/g, '') // strip Arabic chars (slug from EN only)
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '-') // collapse whitespace and hyphens in one pass
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}
