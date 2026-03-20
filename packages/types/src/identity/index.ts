import type { UserRole, UserStatus } from '../enums';

export interface PublicUser {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  language: string;
  verifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
