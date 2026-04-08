CREATE TABLE "market"."benefit_info" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"ministry_ar" text NOT NULL,
	"documents_ar" text[] NOT NULL,
	"office_name_ar" text NOT NULL,
	"office_phone" text NOT NULL,
	"office_address_ar" text NOT NULL,
	"enrollment_notes_ar" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_info_slug_idx" ON "market"."benefit_info" USING btree ("slug");