import { Navigate, Outlet } from 'react-router';
import { UserRole } from '@hena-wadeena/types';
import { useAuth } from '@/hooks/use-auth';

import { hasRequiredRole } from './access-control';

interface RequireRoleProps {
  roles: UserRole[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRequiredRole(user.role, roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
