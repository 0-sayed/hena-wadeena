import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  w?: string;
  h?: string;
  shape?: 'rect' | 'circle' | 'text';
  lines?: number;
}

export function SkeletonPulse({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-muted', className)} {...props}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export function Skeleton({
  w = 'w-full',
  h = 'h-4',
  shape = 'rect',
  lines = 3,
  className = '',
  ...rest
}: SkeletonProps) {
  if (shape === 'text') {
    return (
      <div className={`space-y-3 ${className}`} {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonPulse
            key={i}
            className={`${h} rounded-lg`}
            style={{ width: i === lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <SkeletonPulse
      className={`${w} ${h} ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'} ${className}`}
      {...rest}
    />
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/50 overflow-hidden bg-card ${className}`}>
      <SkeletonPulse className="w-full h-48" />
      <div className="p-6 space-y-3">
        <SkeletonPulse className="h-5 w-3/4" />
        <SkeletonPulse className="h-3 w-full" />
        <SkeletonPulse className="h-3 w-[70%]" />
        <div className="flex justify-between pt-2">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-5 px-6">
          <SkeletonPulse className="h-5 w-24" />
        </td>
      ))}
    </tr>
  );
}

export function CardGridSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
