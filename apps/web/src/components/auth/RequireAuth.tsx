import { Navigate, Outlet, useLocation } from 'react-router';

export function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
