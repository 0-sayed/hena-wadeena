CREATE TYPE "identity"."kyc_doc_type" AS ENUM('national_id', 'student_id', 'guide_license', 'commercial_register', 'business_document');--> statement-breakpoint
CREATE TYPE "identity"."kyc_status" AS ENUM('pending', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "identity"."notification_type" AS ENUM('booking_requested', 'booking_confirmed', 'booking_cancelled', 'booking_completed', 'review_submitted', 'kyc_approved', 'kyc_rejected', 'system');--> statement-breakpoint
ALTER TYPE "identity"."audit_event_type" ADD VALUE 'kyc_submitted';--> statement-breakpoint
ALTER TYPE "identity"."audit_event_type" ADD VALUE 'kyc_approved';--> statement-breakpoint
ALTER TYPE "identity"."audit_event_type" ADD VALUE 'kyc_rejected';--> statement-breakpoint
CREATE TABLE "identity"."notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "identity"."notification_type" NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"body_ar" text NOT NULL,
	"body_en" text NOT NULL,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."user_kyc" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"doc_type" "identity"."kyc_doc_type" NOT NULL,
	"doc_url" text NOT NULL,
	"status" "identity"."kyc_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."user_kyc" ADD CONSTRAINT "user_kyc_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."user_kyc" ADD CONSTRAINT "user_kyc_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "identity"."notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "identity"."notifications" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE "identity"."notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_kyc_user" ON "identity"."user_kyc" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kyc_status" ON "identity"."user_kyc" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_kyc_unique_pending" ON "identity"."user_kyc" USING btree ("user_id","doc_type") WHERE "identity"."user_kyc"."status" = 'pending';