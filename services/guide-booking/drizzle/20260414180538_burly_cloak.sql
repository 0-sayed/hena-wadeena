ALTER TABLE "guide_booking"."desert_trips" ADD COLUMN "ranger_station_name" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."desert_trips" DROP COLUMN "ranger_station_id";