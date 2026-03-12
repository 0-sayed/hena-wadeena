CREATE SCHEMA "market";
--> statement-breakpoint
CREATE TYPE "market"."application_status" AS ENUM('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "market"."business_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "market"."investment_sector" AS ENUM('agriculture', 'tourism', 'industry', 'real_estate', 'services', 'technology', 'energy');--> statement-breakpoint
CREATE TYPE "market"."listing_category" AS ENUM('place', 'accommodation', 'restaurant', 'service', 'activity', 'transport', 'education', 'healthcare', 'shopping');--> statement-breakpoint
CREATE TYPE "market"."listing_status" AS ENUM('draft', 'active', 'sold', 'rented', 'suspended');--> statement-breakpoint
CREATE TYPE "market"."listing_type" AS ENUM('real_estate', 'land', 'business');--> statement-breakpoint
CREATE TYPE "market"."opportunity_status" AS ENUM('draft', 'review', 'active', 'closed', 'taken');--> statement-breakpoint
CREATE TYPE "market"."transaction_type" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TABLE "market"."business_directories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"category" text NOT NULL,
	"description" text,
	"location" geometry(point, 4326),
	"phone" text,
	"website" text,
	"logo_url" text,
	"status" "market"."business_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market"."investment_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"amount_proposed" integer,
	"message" text,
	"contact_email" text,
	"contact_phone" text,
	"documents" text[],
	"status" "market"."application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_investor_opportunity_unique" UNIQUE("investor_id","opportunity_id"),
	CONSTRAINT "amount_proposed_non_negative" CHECK ("market"."investment_applications"."amount_proposed" >= 0)
);
--> statement-breakpoint
CREATE TABLE "market"."investment_opportunities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"description" text,
	"sector" "market"."investment_sector" NOT NULL,
	"area" text,
	"land_area_sqm" real,
	"min_investment" integer NOT NULL,
	"max_investment" integer NOT NULL,
	"currency" text DEFAULT 'EGP',
	"expected_return_pct" real,
	"payback_period_years" real,
	"incentives" text[],
	"infrastructure" jsonb,
	"contact" jsonb,
	"documents" text[],
	"images" text[],
	"status" "market"."opportunity_status" DEFAULT 'draft' NOT NULL,
	"source" text,
	"expires_at" date,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"interest_count" integer DEFAULT 0 NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_min_non_negative" CHECK ("market"."investment_opportunities"."min_investment" >= 0),
	CONSTRAINT "investment_max_non_negative" CHECK ("market"."investment_opportunities"."max_investment" >= 0),
	CONSTRAINT "investment_range_valid" CHECK ("market"."investment_opportunities"."max_investment" >= "market"."investment_opportunities"."min_investment")
);
--> statement-breakpoint
CREATE TABLE "market"."listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"listing_type" "market"."listing_type" NOT NULL,
	"transaction" "market"."transaction_type" NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"description" text,
	"category" "market"."listing_category" NOT NULL,
	"sub_category" text,
	"price" integer NOT NULL,
	"price_unit" text DEFAULT 'EGP',
	"price_range" text,
	"area_sqm" real,
	"location" geometry(point, 4326),
	"address" text,
	"district" text,
	"images" text[],
	"features" jsonb,
	"amenities" text[],
	"tags" text[],
	"contact" jsonb,
	"opening_hours" text,
	"slug" text NOT NULL,
	"status" "market"."listing_status" DEFAULT 'draft' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_until" timestamp with time zone,
	"is_published" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rating_avg" real DEFAULT 0,
	"review_count" integer DEFAULT 0,
	"views_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "market"."price_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"district" text NOT NULL,
	"listing_type" "market"."listing_type" NOT NULL,
	"avg_price" integer NOT NULL,
	"min_price" integer NOT NULL,
	"max_price" integer NOT NULL,
	"sample_count" integer NOT NULL,
	"snapshot_date" date NOT NULL,
	CONSTRAINT "price_snapshots_district_type_date_unique" UNIQUE("district","listing_type","snapshot_date")
);
--> statement-breakpoint
CREATE TABLE "market"."reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"comment" text,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"is_verified_visit" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"images" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_reviewer_listing_unique" UNIQUE("reviewer_id","listing_id"),
	CONSTRAINT "rating_range" CHECK ("market"."reviews"."rating" >= 1 AND "market"."reviews"."rating" <= 5)
);
--> statement-breakpoint
ALTER TABLE "market"."investment_applications" ADD CONSTRAINT "investment_applications_opportunity_id_investment_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "market"."investment_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market"."reviews" ADD CONSTRAINT "reviews_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "market"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_business_dir_owner_id" ON "market"."business_directories" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_business_dir_category" ON "market"."business_directories" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_business_dir_location" ON "market"."business_directories" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_applications_opportunity_id" ON "market"."investment_applications" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_applications_investor_id" ON "market"."investment_applications" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "idx_applications_status" ON "market"."investment_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_opportunities_status" ON "market"."investment_opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_opportunities_sector" ON "market"."investment_opportunities" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "idx_opportunities_owner_id" ON "market"."investment_opportunities" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_active_unique" ON "market"."listings" USING btree ("slug") WHERE "market"."listings"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_listings_status" ON "market"."listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_listings_category" ON "market"."listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_listings_district" ON "market"."listings" USING btree ("district");--> statement-breakpoint
CREATE INDEX "idx_listings_owner_id" ON "market"."listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_listings_created_at" ON "market"."listings" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_listings_location" ON "market"."listings" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_listings_tags" ON "market"."listings" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_price_snapshots_date" ON "market"."price_snapshots" USING btree ("snapshot_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_price_snapshots_district_type" ON "market"."price_snapshots" USING btree ("district","listing_type");--> statement-breakpoint
CREATE INDEX "idx_reviews_listing_id" ON "market"."reviews" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewer_id" ON "market"."reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_created_at" ON "market"."reviews" USING btree ("created_at" DESC NULLS LAST);