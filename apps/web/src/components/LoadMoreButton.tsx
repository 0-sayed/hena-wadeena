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
  if (!hasNextPage) return null;

  return (
    <div className="flex justify-center mt-10">
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
