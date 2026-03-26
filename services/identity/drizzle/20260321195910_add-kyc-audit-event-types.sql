-- Custom SQL migration file, put your code below! --
ALTER TYPE "identity"."audit_event_type" ADD VALUE IF NOT EXISTS 'kyc_submitted';
ALTER TYPE "identity"."audit_event_type" ADD VALUE IF NOT EXISTS 'kyc_approved';
ALTER TYPE "identity"."audit_event_type" ADD VALUE IF NOT EXISTS 'kyc_rejected';
