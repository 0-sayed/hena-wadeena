import { identitySchema } from './schema';

export const userRoleEnum = identitySchema.enum('user_role', [
  'tourist',
  'resident',
  'merchant',
  'guide',
  'investor',
  'student',
  'driver',
  'moderator',
  'reviewer',
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
  'kyc_submitted',
  'kyc_approved',
  'kyc_rejected',
]);

export const notificationTypeEnum = identitySchema.enum('notification_type', [
  'booking_requested',
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed',
  'review_submitted',
  'kyc_approved',
  'kyc_rejected',
  'system',
]);

export const kycStatusEnum = identitySchema.enum('kyc_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
]);

export const kycDocTypeEnum = identitySchema.enum('kyc_doc_type', [
  'national_id',
  'student_id',
  'guide_license',
  'commercial_register',
  'business_document',
]);
