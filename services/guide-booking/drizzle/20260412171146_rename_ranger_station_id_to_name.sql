ALTER TABLE "guide_booking"."desert_trips" RENAME COLUMN "ranger_station_id" TO "ranger_station_name";--> statement-breakpoint
ALTER TABLE "guide_booking"."desert_trips" ALTER COLUMN "ranger_station_name" SET DATA TYPE text;
