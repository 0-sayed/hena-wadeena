CREATE TYPE "market"."listing_inquiry_status" AS ENUM('pending', 'read', 'replied');--> statement-breakpoint
CREATE TABLE "market"."listing_inquiries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"listing_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"message" text NOT NULL,
	"reply_message" text,
	"status" "market"."listing_inquiry_status" DEFAULT 'pending' NOT NULL,
	"read_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "market"."listing_inquiries" ADD CONSTRAINT "listing_inquiries_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "market"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_listing_inquiries_listing_id" ON "market"."listing_inquiries" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_listing_inquiries_sender_id" ON "market"."listing_inquiries" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_listing_inquiries_receiver_id" ON "market"."listing_inquiries" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "idx_listing_inquiries_status" ON "market"."listing_inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_listing_inquiries_created_at" ON "market"."listing_inquiries" USING btree ("created_at");