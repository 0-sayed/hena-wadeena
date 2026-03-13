CREATE SCHEMA "map";
--> statement-breakpoint
CREATE TYPE "map"."carpool_ride_status" AS ENUM('open', 'full', 'departed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "map"."passenger_status" AS ENUM('requested', 'confirmed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "map"."poi_category" AS ENUM('historical', 'natural', 'religious', 'recreational', 'accommodation', 'restaurant', 'service', 'government');--> statement-breakpoint
CREATE TYPE "map"."poi_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "map"."carpool_passengers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ride_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"status" "map"."passenger_status" DEFAULT 'requested' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_carpool_passengers_seats_positive" CHECK ("map"."carpool_passengers"."seats" >= 1)
);
--> statement-breakpoint
CREATE TABLE "map"."carpool_rides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"driver_id" uuid NOT NULL,
	"origin" geometry(Point,4326) NOT NULL,
	"destination" geometry(Point,4326) NOT NULL,
	"origin_name" text NOT NULL,
	"destination_name" text NOT NULL,
	"departure_time" timestamp with time zone NOT NULL,
	"seats_total" integer NOT NULL,
	"seats_taken" integer DEFAULT 0 NOT NULL,
	"price_per_seat" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"status" "map"."carpool_ride_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_carpool_rides_seats_total_positive" CHECK ("map"."carpool_rides"."seats_total" >= 1),
	CONSTRAINT "chk_carpool_rides_seats_taken_valid" CHECK ("map"."carpool_rides"."seats_taken" >= 0 AND "map"."carpool_rides"."seats_taken" <= "map"."carpool_rides"."seats_total"),
	CONSTRAINT "chk_carpool_rides_price_non_neg" CHECK ("map"."carpool_rides"."price_per_seat" >= 0)
);
--> statement-breakpoint
CREATE TABLE "map"."points_of_interest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"description" text,
	"category" "map"."poi_category" NOT NULL,
	"location" geometry(Point,4326) NOT NULL,
	"address" text,
	"phone" text,
	"website" text,
	"images" text[],
	"rating_avg" real DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"status" "map"."poi_status" DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_pois_rating_range" CHECK ("map"."points_of_interest"."rating_avg" IS NULL OR ("map"."points_of_interest"."rating_avg" >= 0 AND "map"."points_of_interest"."rating_avg" <= 5))
);
--> statement-breakpoint
ALTER TABLE "map"."carpool_passengers" ADD CONSTRAINT "carpool_passengers_ride_id_carpool_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "map"."carpool_rides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_carpool_passengers_ride_id" ON "map"."carpool_passengers" USING btree ("ride_id");--> statement-breakpoint
CREATE INDEX "idx_carpool_passengers_user_id" ON "map"."carpool_passengers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_carpool_passengers_status" ON "map"."carpool_passengers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_carpool_rides_driver_id" ON "map"."carpool_rides" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "idx_carpool_rides_status" ON "map"."carpool_rides" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_carpool_rides_departure_time" ON "map"."carpool_rides" USING btree ("departure_time");--> statement-breakpoint
CREATE INDEX "idx_carpool_rides_origin" ON "map"."carpool_rides" USING gist ("origin");--> statement-breakpoint
CREATE INDEX "idx_carpool_rides_destination" ON "map"."carpool_rides" USING gist ("destination");--> statement-breakpoint
CREATE INDEX "idx_pois_location" ON "map"."points_of_interest" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_pois_category" ON "map"."points_of_interest" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_pois_status" ON "map"."points_of_interest" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pois_submitted_by" ON "map"."points_of_interest" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "idx_pois_created_at" ON "map"."points_of_interest" USING btree ("created_at" DESC NULLS LAST);