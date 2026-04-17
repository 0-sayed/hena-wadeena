CREATE TYPE "map"."incident_status" AS ENUM('reported', 'under_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "map"."incident_type" AS ENUM('litter', 'illegal_dumping', 'vehicle_damage', 'fire_remains', 'vandalism');--> statement-breakpoint
CREATE TABLE "map"."environmental_incidents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"incident_type" "map"."incident_type" NOT NULL,
	"status" "map"."incident_status" DEFAULT 'reported' NOT NULL,
	"description_ar" text,
	"description_en" text,
	"location" geometry(point) NOT NULL,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"eeaa_reference" text,
	"admin_notes" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_incidents_status" ON "map"."environmental_incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_incidents_created_at" ON "map"."environmental_incidents" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_incidents_reporter" ON "map"."environmental_incidents" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_incidents_location" ON "map"."environmental_incidents" USING gist ("location");