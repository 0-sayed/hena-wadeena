CREATE TYPE "guide_booking"."desert_trip_status" AS ENUM('pending', 'checked_in', 'overdue', 'alert_sent', 'resolved');--> statement-breakpoint
CREATE TYPE "guide_booking"."vehicle_type" AS ENUM('4WD', 'minibus', 'motorcycle');--> statement-breakpoint
CREATE TABLE "guide_booking"."desert_trips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"expected_arrival_at" timestamp with time zone NOT NULL,
	"destination_name" text NOT NULL,
	"emergency_contact" text NOT NULL,
	"ranger_station_id" uuid,
	"checked_in_at" timestamp with time zone,
	"alert_triggered_at" timestamp with time zone,
	"gps_breadcrumbs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "guide_booking"."desert_trip_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "etaa_license_number" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "etaa_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "etaa_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "insurance_policy_url" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "insurance_valid_until" date;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "vehicle_plate" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "vehicle_type" "guide_booking"."vehicle_type";--> statement-breakpoint
ALTER TABLE "guide_booking"."tour_packages" ADD COLUMN "price_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "guide_booking"."tour_packages" ADD COLUMN "no_hidden_fees" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guide_booking"."desert_trips" ADD CONSTRAINT "desert_trips_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "guide_booking"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_desert_trips_booking_id" ON "guide_booking"."desert_trips" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_desert_trips_status_arrival" ON "guide_booking"."desert_trips" USING btree ("status","expected_arrival_at");