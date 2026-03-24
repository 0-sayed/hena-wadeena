import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ icon: Icon, message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Button asChild variant="outline">
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
