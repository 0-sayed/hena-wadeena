import { identitySchema } from './schema';

export const userRoleEnum = identitySchema.enum('user_role', [
  'tourist',
  'resident',
  'merchant',
  'guide',
  'investor',
  'student',
  'driver',
  'admin',
]);

export const userStatusEnum = identitySchema.enum('user_status', ['active', 'suspended', 'banned']);

export const otpPurposeEnum = identitySchema.enum('otp_purpose', ['login', 'reset', 'verify']);

export const auditEventTypeEnum = identitySchema.enum('audit_event_type', [
  'register',
  'login',
  'logout',
  'failed_login',
  'password_changed',
  'password_reset',
  'token_refreshed',
  'account_suspended',
  'account_banned',
  'role_changed',
  'account_activated',
  'account_deleted',
]);
