import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
  changePercent: number | null;
  size?: 'sm' | 'md';
  showSign?: boolean;
}

export function TrendBadge({ changePercent, size = 'md', showSign = false }: TrendBadgeProps) {
  const value = changePercent ?? 0;

  const colorClass =
    value > 0
      ? 'bg-primary/10 text-primary'
      : value < 0
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';

  const sizeClass =
    size === 'sm'
      ? 'gap-1 px-2 py-1 text-sm font-medium'
      : 'gap-1.5 px-3 py-1.5 text-sm font-semibold';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  const displayValue = showSign ? `${value > 0 ? '+' : ''}${value}%` : `${Math.abs(value)}%`;

  return (
    <div className={`inline-flex items-center rounded-full ${sizeClass} ${colorClass}`}>
      <Icon className={iconSize} />
      {displayValue}
    </div>
  );
}
