CREATE SCHEMA IF NOT EXISTS "identity";
--> statement-breakpoint
CREATE TYPE "identity"."audit_event_type" AS ENUM('register', 'login', 'logout', 'failed_login', 'password_changed', 'password_reset', 'token_refreshed', 'account_suspended', 'account_banned');--> statement-breakpoint
CREATE TYPE "identity"."otp_purpose" AS ENUM('login', 'reset', 'verify');--> statement-breakpoint
CREATE TYPE "identity"."user_role" AS ENUM('tourist', 'resident', 'merchant', 'guide', 'investor', 'student', 'driver', 'admin');--> statement-breakpoint
CREATE TYPE "identity"."user_status" AS ENUM('active', 'suspended', 'banned');--> statement-breakpoint
CREATE TABLE "identity"."audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"event_type" "identity"."audit_event_type" NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."auth_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family" uuid NOT NULL,
	"device_info" text,
	"ip_address" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."otp_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"purpose" "identity"."otp_purpose" NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"full_name" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"password_hash" text NOT NULL,
	"role" "identity"."user_role" DEFAULT 'tourist' NOT NULL,
	"status" "identity"."user_status" DEFAULT 'active' NOT NULL,
	"language" text DEFAULT 'ar' NOT NULL,
	"verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_events_user_created" ON "identity"."audit_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_events_type_created" ON "identity"."audit_events" USING btree ("event_type","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_auth_tokens_token_hash" ON "identity"."auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_auth_tokens_user_active" ON "identity"."auth_tokens" USING btree ("user_id") WHERE "identity"."auth_tokens"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_auth_tokens_family" ON "identity"."auth_tokens" USING btree ("family");--> statement-breakpoint
CREATE INDEX "idx_otp_codes_target_purpose" ON "identity"."otp_codes" USING btree ("target","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "identity"."users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_unique" ON "identity"."users" USING btree ("phone") WHERE "identity"."users"."phone" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "identity"."users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "identity"."users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "identity"."users" USING btree ("created_at" DESC NULLS LAST);