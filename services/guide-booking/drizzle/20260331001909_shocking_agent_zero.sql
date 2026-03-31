-- guides.search_vector
ALTER TABLE "guide_booking"."guides"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("bio_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("bio_en", '')), 'A')
) STORED;
--> statement-breakpoint
CREATE INDEX "idx_guides_search" ON "guide_booking"."guides" USING gin("search_vector");
--> statement-breakpoint
-- attractions.search_vector
ALTER TABLE "guide_booking"."attractions"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("name_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("name_en", '')), 'A') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("description_ar", ''))), 'B') ||
  setweight(to_tsvector('simple', coalesce("description_en", '')), 'B') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("history_ar", ''))), 'B')
) STORED;
--> statement-breakpoint
CREATE INDEX "idx_attractions_search" ON "guide_booking"."attractions" USING gin("search_vector");
--> statement-breakpoint
-- tour_packages.search_vector
ALTER TABLE "guide_booking"."tour_packages"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("title_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("title_en", '')), 'A') ||
  setweight(to_tsvector('simple', guide_booking.normalize_arabic(coalesce("description", ''))), 'B')
) STORED;
--> statement-breakpoint
CREATE INDEX "idx_tour_packages_search" ON "guide_booking"."tour_packages" USING gin("search_vector");
