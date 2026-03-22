CREATE TABLE "guide_booking"."tour_package_attractions" (
	"package_id" uuid NOT NULL,
	"attraction_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tour_package_attractions_package_id_attraction_id_pk" PRIMARY KEY("package_id","attraction_id")
);
--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "profile_image" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "guide_booking"."guides" ADD COLUMN "areas_of_operation" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "guide_booking"."tour_package_attractions" ADD CONSTRAINT "tour_package_attractions_package_id_tour_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "guide_booking"."tour_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_booking"."tour_package_attractions" ADD CONSTRAINT "tour_package_attractions_attraction_id_attractions_id_fk" FOREIGN KEY ("attraction_id") REFERENCES "guide_booking"."attractions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tpa_attraction_id" ON "guide_booking"."tour_package_attractions" USING btree ("attraction_id");--> statement-breakpoint
CREATE INDEX "idx_guides_areas_of_operation" ON "guide_booking"."guides" USING gin ("areas_of_operation");