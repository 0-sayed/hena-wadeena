import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type LtrTextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
};

export function LtrText<T extends ElementType = 'span'>({
  as,
  children,
  className,
}: LtrTextProps<T>) {
  const Component = as ?? 'span';

  return (
    <Component className={cn('inline-block text-left', className)} data-ltr="contact" dir="ltr">
      {children}
    </Component>
  );
}
