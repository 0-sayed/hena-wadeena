import { Navigate, Outlet } from 'react-router';
import type { AuthUser } from '@/services/api';

interface RequireRoleProps {
  roles: string[];
}

export function RequireRole({ roles }: RequireRoleProps) {
  const stored = localStorage.getItem('user');
  if (!stored) return <Navigate to="/login" replace />;

  try {
    const user = JSON.parse(stored) as AuthUser;
    if (!roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
