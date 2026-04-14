import { UserRole } from '@hena-wadeena/types';

const ROLE_DASHBOARD_PATHS: Partial<Record<UserRole, string>> = {
  [UserRole.GUIDE]: '/dashboard/guide',
  [UserRole.MERCHANT]: '/dashboard/merchant',
  [UserRole.DRIVER]: '/dashboard/driver',
  [UserRole.INVESTOR]: '/dashboard/investor',
  [UserRole.TOURIST]: '/dashboard/tourist',
  [UserRole.STUDENT]: '/dashboard/student',
  [UserRole.RESIDENT]: '/dashboard/resident',
  [UserRole.FARMER]: '/dashboard/farmer',
};

/** Returns the role-specific dashboard path, or null for roles without one (admin, reviewer). */
export function getRoleDashboardPath(role: UserRole): string | null {
  return ROLE_DASHBOARD_PATHS[role] ?? null;
}
