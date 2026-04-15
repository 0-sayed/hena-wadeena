import { NewsCategory } from '@hena-wadeena/types';

export const NEWS_CATEGORY_OPTIONS = [
  { value: NewsCategory.ANNOUNCEMENT, label: 'إعلانات' },
  { value: NewsCategory.TOURISM, label: 'سياحة' },
  { value: NewsCategory.INVESTMENT, label: 'استثمار' },
  { value: NewsCategory.AGRICULTURE, label: 'زراعة' },
  { value: NewsCategory.INFRASTRUCTURE, label: 'بنية تحتية' },
  { value: NewsCategory.CULTURE, label: 'ثقافة' },
  { value: NewsCategory.EVENTS, label: 'فعاليات' },
] as const;

export const NEWS_CATEGORY_LABELS = Object.fromEntries(
  NEWS_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<NewsCategory, string>;

/** Tailwind bg+text classes per category — safe-listed via explicit string literals */
export const NEWS_CATEGORY_COLORS: Record<NewsCategory, string> = {
  [NewsCategory.ANNOUNCEMENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  [NewsCategory.TOURISM]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  [NewsCategory.INVESTMENT]:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  [NewsCategory.AGRICULTURE]: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
  [NewsCategory.INFRASTRUCTURE]:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  [NewsCategory.CULTURE]:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  [NewsCategory.EVENTS]: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

export function formatNewsDate(
  dateStr: string | null,
  opts: { monthFormat?: 'long' | 'short'; nullValue?: string } = {},
): string {
  if (!dateStr) return opts.nullValue ?? '';
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: opts.monthFormat ?? 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
}
