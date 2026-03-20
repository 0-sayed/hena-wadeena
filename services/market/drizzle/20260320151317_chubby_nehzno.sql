CREATE TYPE "market"."commodity_category" AS ENUM('fruits', 'grains', 'vegetables', 'oils', 'livestock', 'other');--> statement-breakpoint
CREATE TYPE "market"."commodity_unit" AS ENUM('kg', 'ton', 'ardeb', 'kantar', 'liter', 'piece', 'box');--> statement-breakpoint
CREATE TYPE "market"."price_type" AS ENUM('wholesale', 'retail', 'farm_gate');--> statement-breakpoint
CREATE TYPE "market"."verification_status" AS ENUM('pending', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TABLE "market"."business_commodities" (
	"business_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	CONSTRAINT "business_commodities_business_id_commodity_id_pk" PRIMARY KEY("business_id","commodity_id")
);
--> statement-breakpoint
CREATE TABLE "market"."commodities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"category" "market"."commodity_category" NOT NULL,
	"unit" "market"."commodity_unit" NOT NULL,
	"icon_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market"."commodity_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"commodity_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"price_type" "market"."price_type" NOT NULL,
	"region" text NOT NULL,
	"source" text,
	"notes" text,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_commodity_price_non_neg" CHECK ("market"."commodity_prices"."price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "description_ar" text;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "verification_status" "market"."verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "market"."business_directories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market"."business_commodities" ADD CONSTRAINT "business_commodities_business_id_business_directories_id_fk" FOREIGN KEY ("business_id") REFERENCES "market"."business_directories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market"."business_commodities" ADD CONSTRAINT "business_commodities_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "market"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market"."commodity_prices" ADD CONSTRAINT "commodity_prices_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "market"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_commodities_category" ON "market"."commodities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_commodities_is_active" ON "market"."commodities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_commodity_prices_commodity_date" ON "market"."commodity_prices" USING btree ("commodity_id","recorded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_commodity_prices_recorded_at" ON "market"."commodity_prices" USING btree ("recorded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_commodity_prices_region" ON "market"."commodity_prices" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_biz_dir_verification_status" ON "market"."business_directories" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_biz_dir_district" ON "market"."business_directories" USING btree ("district");