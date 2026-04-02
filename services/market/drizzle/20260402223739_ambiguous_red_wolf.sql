CREATE TYPE "market"."business_inquiry_status" AS ENUM('pending', 'read', 'replied');--> statement-breakpoint
CREATE TABLE "market"."business_inquiries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"message" text NOT NULL,
	"reply_message" text,
	"status" "market"."business_inquiry_status" DEFAULT 'pending' NOT NULL,
	"read_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "market"."business_inquiries" ADD CONSTRAINT "business_inquiries_business_id_business_directories_id_fk" FOREIGN KEY ("business_id") REFERENCES "market"."business_directories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_business_inquiries_business_id" ON "market"."business_inquiries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_business_inquiries_sender_id" ON "market"."business_inquiries" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_business_inquiries_receiver_id" ON "market"."business_inquiries" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "idx_business_inquiries_status" ON "market"."business_inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_business_inquiries_created_at" ON "market"."business_inquiries" USING btree ("created_at");