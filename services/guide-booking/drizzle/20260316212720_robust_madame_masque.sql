CREATE TYPE "guide_booking"."attraction_area" AS ENUM('kharga', 'dakhla', 'farafra', 'baris', 'balat');--> statement-breakpoint
CREATE TYPE "guide_booking"."attraction_type" AS ENUM('attraction', 'historical', 'natural', 'festival', 'adventure');--> statement-breakpoint
CREATE TYPE "guide_booking"."best_season" AS ENUM('winter', 'summer', 'spring', 'all_year');--> statement-breakpoint
CREATE TYPE "guide_booking"."best_time_of_day" AS ENUM('morning', 'evening', 'any');--> statement-breakpoint
CREATE TYPE "guide_booking"."difficulty" AS ENUM('easy', 'moderate', 'hard');--> statement-breakpoint
CREATE TABLE "guide_booking"."attractions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"slug" text NOT NULL,
	"type" "guide_booking"."attraction_type" NOT NULL,
	"area" "guide_booking"."attraction_area" NOT NULL,
	"description_ar" text,
	"description_en" text,
	"history_ar" text,
	"best_season" "guide_booking"."best_season",
	"best_time_of_day" "guide_booking"."best_time_of_day",
	"entry_fee" jsonb,
	"opening_hours" text,
	"duration_hours" real,
	"difficulty" "guide_booking"."difficulty",
	"tips" text[],
	"nearby_slugs" text[],
	"location" geometry(point),
	"images" text[],
	"thumbnail" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"rating_avg" real,
	"review_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_attractions_duration_positive" CHECK ("guide_booking"."attractions"."duration_hours" > 0),
	CONSTRAINT "chk_attractions_review_count_non_neg" CHECK ("guide_booking"."attractions"."review_count" >= 0),
	CONSTRAINT "chk_attractions_rating_avg_range" CHECK ("guide_booking"."attractions"."rating_avg" IS NULL OR ("guide_booking"."attractions"."rating_avg" >= 0 AND "guide_booking"."attractions"."rating_avg" <= 5))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attractions_slug_active_unique" ON "guide_booking"."attractions" USING btree ("slug") WHERE "guide_booking"."attractions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_attractions_location" ON "guide_booking"."attractions" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_attractions_type" ON "guide_booking"."attractions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_attractions_area" ON "guide_booking"."attractions" USING btree ("area");--> statement-breakpoint
CREATE INDEX "idx_attractions_is_active" ON "guide_booking"."attractions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_attractions_is_featured" ON "guide_booking"."attractions" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_attractions_created_at" ON "guide_booking"."attractions" USING btree ("created_at" DESC NULLS LAST);