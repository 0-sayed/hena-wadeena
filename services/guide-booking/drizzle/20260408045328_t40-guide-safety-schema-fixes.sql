CREATE TYPE "guide_booking"."desert_trip_status" AS ENUM('pending', 'checked_in', 'overdue', 'alert_sent', 'resolved');--> statement-breakpoint
CREATE TYPE "guide_booking"."vehicle_type" AS ENUM('4WD', 'minibus', 'motorcycle');--> statement-breakpoint
ALTER TABLE "guide_booking"."desert_trips" ALTER COLUMN "status" SET DATA TYPE desert_trip_status;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ALTER COLUMN "insurance_valid_until" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ALTER COLUMN "vehicle_type" SET DATA TYPE vehicle_type;--> statement-breakpoint
ALTER TABLE "guide_booking"."tour_packages" ALTER COLUMN "price_breakdown" SET DATA TYPE jsonb;