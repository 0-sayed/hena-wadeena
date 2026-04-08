import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { resolveMediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

interface BusinessLogoProps {
  src?: string | null;
  alt: string;
  fallbackIcon: LucideIcon;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function BusinessLogo({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  className,
  iconClassName,
  imageClassName,
}: BusinessLogoProps) {
  const resolvedSrc = resolveMediaUrl(src);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [resolvedSrc]);

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-2xl bg-muted/40',
        className,
      )}
    >
      {resolvedSrc && !hasLoadError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          className={cn('h-full w-full object-cover', imageClassName)}
          onError={() => setHasLoadError(true)}
        />
      ) : (
        <FallbackIcon className={cn('h-7 w-7 text-muted-foreground', iconClassName)} aria-hidden="true" />
      )}
    </div>
  );
}
