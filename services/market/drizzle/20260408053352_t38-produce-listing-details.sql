ALTER TYPE "market"."listing_category" ADD VALUE 'agricultural_produce';--> statement-breakpoint
CREATE TABLE "market"."produce_listing_details" (
	"listing_id" uuid PRIMARY KEY NOT NULL,
	"commodity_type" text NOT NULL,
	"quantity_kg" numeric(10, 2),
	"harvest_date" date,
	"storage_type" text NOT NULL,
	"certifications" text[] DEFAULT '{}' NOT NULL,
	"preferred_buyer" text NOT NULL,
	"contact_phone" text,
	"contact_whatsapp" text
);
--> statement-breakpoint
ALTER TABLE "market"."produce_listing_details" ADD CONSTRAINT "produce_listing_details_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "market"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_produce_commodity_type" ON "market"."produce_listing_details" USING btree ("commodity_type");