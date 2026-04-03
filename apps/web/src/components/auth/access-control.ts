import { UserRole } from '@hena-wadeena/types';

export function hasRequiredRole(role: UserRole | undefined, roles: readonly UserRole[]): boolean {
  return role !== undefined && roles.includes(role);
}
