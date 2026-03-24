export const bookingStatusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  pending: { label: 'بانتظار التأكيد', variant: 'secondary' },
  confirmed: { label: 'مؤكد', variant: 'default' },
  in_progress: { label: 'جارٍ', variant: 'default' },
  completed: { label: 'مكتمل', variant: 'outline' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
};
