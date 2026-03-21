import { formatDistanceToNow } from 'date-fns';
import { arEG } from 'date-fns/locale/ar-EG';

const arabicDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const arabicDateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(date: Date | string): string {
  return arabicDateFormatter.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return arabicDateTimeFormatter.format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: arEG,
  });
}
