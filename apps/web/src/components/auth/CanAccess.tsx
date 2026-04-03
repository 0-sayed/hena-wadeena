import type { ReactNode } from 'react';
import { UserRole } from '@hena-wadeena/types';
import { useAuth } from '@/hooks/use-auth';

import { hasRequiredRole } from './access-control';

interface CanAccessProps {
  roles: readonly UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanAccess({ roles, children, fallback = null }: CanAccessProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !hasRequiredRole(user?.role, roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
