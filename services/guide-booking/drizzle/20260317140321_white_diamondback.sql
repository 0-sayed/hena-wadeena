DROP INDEX "guide_booking"."attractions_slug_active_unique";--> statement-breakpoint
ALTER TABLE "guide_booking"."attractions" ALTER COLUMN "review_count" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "attractions_slug_unique" ON "guide_booking"."attractions" USING btree ("slug");