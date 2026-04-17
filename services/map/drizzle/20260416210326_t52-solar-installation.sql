-- Custom SQL migration file, put your code below! --
ALTER TYPE "map"."poi_category" ADD VALUE 'solar_installation';--> statement-breakpoint
ALTER TABLE "map"."points_of_interest" ADD COLUMN "metadata" jsonb;--> statement-breakpoint