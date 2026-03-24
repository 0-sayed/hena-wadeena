import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadMoreButtonProps {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

export function LoadMoreButton({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: LoadMoreButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(isFetchingNextPage);
  const fetchNextPageRef = useRef(fetchNextPage);
  isFetchingRef.current = isFetchingNextPage;
  fetchNextPageRef.current = fetchNextPage;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingRef.current) {
          void fetchNextPageRef.current();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage]);

  if (!hasNextPage) return null;

  return (
    <div ref={containerRef} className="flex justify-center mt-10">
      <Button
        variant="outline"
        size="lg"
        onClick={() => void fetchNextPage()}
        disabled={isFetchingNextPage}
      >
        {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
        تحميل المزيد
      </Button>
    </div>
  );
}
