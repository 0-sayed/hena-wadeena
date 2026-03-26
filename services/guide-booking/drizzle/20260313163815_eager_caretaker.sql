CREATE SCHEMA IF NOT EXISTS "guide_booking";
--> statement-breakpoint
CREATE TYPE "guide_booking"."booking_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "guide_booking"."package_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "guide_booking"."bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"package_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"tourist_id" uuid NOT NULL,
	"booking_date" date NOT NULL,
	"start_time" time NOT NULL,
	"people_count" integer NOT NULL,
	"total_price" integer NOT NULL,
	"status" "guide_booking"."booking_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bookings_total_price_non_neg" CHECK ("guide_booking"."bookings"."total_price" >= 0),
	CONSTRAINT "chk_bookings_people_count_positive" CHECK ("guide_booking"."bookings"."people_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "guide_booking"."guide_availability" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guide_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_blocked" boolean DEFAULT true NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "guide_booking"."guide_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"booking_id" uuid NOT NULL,
	"guide_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"guide_reply" text,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"images" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_guide_reviews_helpful_count_non_neg" CHECK ("guide_booking"."guide_reviews"."helpful_count" >= 0),
	CONSTRAINT "chk_guide_reviews_rating_range" CHECK ("guide_booking"."guide_reviews"."rating" >= 1 AND "guide_booking"."guide_reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "guide_booking"."guides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bio_ar" text,
	"bio_en" text,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"license_number" text NOT NULL,
	"license_verified" boolean DEFAULT false NOT NULL,
	"base_price" integer NOT NULL,
	"rating_avg" real DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_guides_base_price_non_neg" CHECK ("guide_booking"."guides"."base_price" >= 0),
	CONSTRAINT "chk_guides_rating_count_non_neg" CHECK ("guide_booking"."guides"."rating_count" >= 0),
	CONSTRAINT "chk_guides_rating_range" CHECK ("guide_booking"."guides"."rating_avg" IS NULL OR ("guide_booking"."guides"."rating_avg" >= 0 AND "guide_booking"."guides"."rating_avg" <= 5))
);
--> statement-breakpoint
CREATE TABLE "guide_booking"."tour_packages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"guide_id" uuid NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"description" text,
	"duration_hours" real NOT NULL,
	"max_people" integer NOT NULL,
	"price" integer NOT NULL,
	"includes" text[],
	"images" text[],
	"status" "guide_booking"."package_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_tour_packages_price_positive" CHECK ("guide_booking"."tour_packages"."price" > 0),
	CONSTRAINT "chk_tour_packages_max_people_positive" CHECK ("guide_booking"."tour_packages"."max_people" >= 1),
	CONSTRAINT "chk_tour_packages_duration_positive" CHECK ("guide_booking"."tour_packages"."duration_hours" > 0)
);
--> statement-breakpoint
ALTER TABLE "guide_booking"."bookings" ADD CONSTRAINT "bookings_package_id_tour_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "guide_booking"."tour_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_booking"."bookings" ADD CONSTRAINT "bookings_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "guide_booking"."guides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_booking"."guide_availability" ADD CONSTRAINT "guide_availability_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "guide_booking"."guides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_booking"."guide_reviews" ADD CONSTRAINT "fk_guide_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "guide_booking"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_booking"."tour_packages" ADD CONSTRAINT "tour_packages_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "guide_booking"."guides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bookings_package_id" ON "guide_booking"."bookings" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_guide_id" ON "guide_booking"."bookings" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_tourist_id" ON "guide_booking"."bookings" USING btree ("tourist_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "guide_booking"."bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_booking_date" ON "guide_booking"."bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "idx_bookings_created_at" ON "guide_booking"."bookings" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_guide_availability_guide_date" ON "guide_booking"."guide_availability" USING btree ("guide_id","date");--> statement-breakpoint
CREATE INDEX "idx_guide_availability_guide_id" ON "guide_booking"."guide_availability" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "idx_guide_availability_date" ON "guide_booking"."guide_availability" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_guide_reviews_booking_id" ON "guide_booking"."guide_reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_guide_reviews_guide_id" ON "guide_booking"."guide_reviews" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "idx_guide_reviews_reviewer_id" ON "guide_booking"."guide_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "idx_guide_reviews_rating" ON "guide_booking"."guide_reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_guide_reviews_created_at" ON "guide_booking"."guide_reviews" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_guides_user_id" ON "guide_booking"."guides" USING btree ("user_id") WHERE "guide_booking"."guides"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_guides_license_number" ON "guide_booking"."guides" USING btree ("license_number") WHERE "guide_booking"."guides"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_guides_active" ON "guide_booking"."guides" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_guides_created_at" ON "guide_booking"."guides" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_guides_languages" ON "guide_booking"."guides" USING gin ("languages");--> statement-breakpoint
CREATE INDEX "idx_guides_specialties" ON "guide_booking"."guides" USING gin ("specialties");--> statement-breakpoint
CREATE INDEX "idx_tour_packages_guide_id" ON "guide_booking"."tour_packages" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "idx_tour_packages_status" ON "guide_booking"."tour_packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tour_packages_created_at" ON "guide_booking"."tour_packages" USING btree ("created_at" DESC NULLS LAST);