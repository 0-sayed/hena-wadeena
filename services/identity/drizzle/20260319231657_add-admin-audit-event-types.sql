-- Custom SQL migration file, put your code below! --
ALTER TYPE "identity"."audit_event_type" ADD VALUE IF NOT EXISTS 'role_changed';
ALTER TYPE "identity"."audit_event_type" ADD VALUE IF NOT EXISTS 'account_activated';
ALTER TYPE "identity"."audit_event_type" ADD VALUE IF NOT EXISTS 'account_deleted';