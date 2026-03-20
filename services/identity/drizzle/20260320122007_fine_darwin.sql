ALTER TYPE "identity"."audit_event_type" ADD VALUE 'role_changed';--> statement-breakpoint
ALTER TYPE "identity"."audit_event_type" ADD VALUE 'account_activated';--> statement-breakpoint
ALTER TYPE "identity"."audit_event_type" ADD VALUE 'account_deleted';--> statement-breakpoint
ALTER TYPE "identity"."user_role" ADD VALUE 'moderator' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "identity"."user_role" ADD VALUE 'reviewer' BEFORE 'admin';--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_users_not_deleted" ON "identity"."users" USING btree ("id") WHERE "identity"."users"."deleted_at" IS NULL;