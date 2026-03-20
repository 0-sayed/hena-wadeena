import { Navigate, Outlet } from 'react-router';
import { UserRole } from '@hena-wadeena/types';
import { useAuth } from '@/hooks/use-auth';

interface RequireRoleProps {
  roles: UserRole[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
