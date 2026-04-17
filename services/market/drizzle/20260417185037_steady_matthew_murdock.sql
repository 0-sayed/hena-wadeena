ALTER TYPE "market"."listing_category" ADD VALUE IF NOT EXISTS 'solar_installer';--> statement-breakpoint
ALTER TABLE "market"."benefit_info" ADD COLUMN IF NOT EXISTS "enrollment_notes_en" text;
