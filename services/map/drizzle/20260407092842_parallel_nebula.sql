CREATE TYPE "map"."site_status" AS ENUM('open', 'closed', 'closed_temporarily', 'limited_access', 'under_restoration');--> statement-breakpoint
CREATE TABLE "map"."site_status_updates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"poi_id" uuid NOT NULL,
	"steward_id" uuid NOT NULL,
	"status" "map"."site_status" NOT NULL,
	"note_ar" text,
	"note_en" text,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map"."site_stewards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"poi_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"granted_by" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_site_status_updates_poi_created" ON "map"."site_status_updates" USING btree ("poi_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_site_stewards_poi_user" ON "map"."site_stewards" USING btree ("poi_id","user_id");