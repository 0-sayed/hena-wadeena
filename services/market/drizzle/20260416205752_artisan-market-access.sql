CREATE TYPE "market"."craft_type" AS ENUM('palm_leaf', 'pottery', 'kilim', 'embroidery', 'other');--> statement-breakpoint
CREATE TYPE "market"."wholesale_inquiry_status" AS ENUM('pending', 'read', 'replied');--> statement-breakpoint
CREATE TABLE "market"."wholesale_inquiries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"artisan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"message" text,
	"quantity" integer,
	"status" "market"."wholesale_inquiry_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "market"."artisan_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"bio_ar" text,
	"bio_en" text,
	"craft_types" "market"."craft_type"[] DEFAULT '{}' NOT NULL,
	"area" text NOT NULL,
	"whatsapp" text NOT NULL,
	"profile_image_key" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "market"."artisan_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"artisan_id" uuid NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text,
	"description_ar" text,
	"description_en" text,
	"craft_type" "market"."craft_type" NOT NULL,
	"price" integer,
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"image_keys" text[] DEFAULT '{}' NOT NULL,
	"qr_code_key" text,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "market"."wholesale_inquiries" ADD CONSTRAINT "wholesale_inquiries_product_id_artisan_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "market"."artisan_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market"."wholesale_inquiries" ADD CONSTRAINT "wholesale_inquiries_artisan_id_artisan_profiles_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "market"."artisan_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market"."artisan_products" ADD CONSTRAINT "artisan_products_artisan_id_artisan_profiles_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "market"."artisan_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wholesale_inquiries_artisan_id_idx" ON "market"."wholesale_inquiries" USING btree ("artisan_id");--> statement-breakpoint
CREATE INDEX "wholesale_inquiries_product_id_idx" ON "market"."wholesale_inquiries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "wholesale_inquiries_status_idx" ON "market"."wholesale_inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wholesale_inquiries_created_at_idx" ON "market"."wholesale_inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "artisan_profiles_user_id_idx" ON "market"."artisan_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artisan_profiles_area_idx" ON "market"."artisan_profiles" USING btree ("area");--> statement-breakpoint
CREATE INDEX "artisan_profiles_verified_at_idx" ON "market"."artisan_profiles" USING btree ("verified_at");--> statement-breakpoint
CREATE INDEX "artisan_profiles_craft_types_idx" ON "market"."artisan_profiles" USING gin ("craft_types");--> statement-breakpoint
CREATE INDEX "artisan_products_artisan_id_idx" ON "market"."artisan_products" USING btree ("artisan_id");--> statement-breakpoint
CREATE INDEX "artisan_products_craft_type_idx" ON "market"."artisan_products" USING btree ("craft_type");--> statement-breakpoint
CREATE INDEX "artisan_products_available_idx" ON "market"."artisan_products" USING btree ("available");--> statement-breakpoint
CREATE INDEX "artisan_products_created_at_idx" ON "market"."artisan_products" USING btree ("created_at");