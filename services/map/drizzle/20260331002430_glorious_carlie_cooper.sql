ALTER TABLE "map"."points_of_interest"
ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce("name_ar", ''))), 'A') ||
  setweight(to_tsvector('simple', coalesce("name_en", '')), 'A') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce("description", ''))), 'B') ||
  setweight(to_tsvector('simple', map.normalize_arabic(coalesce("address", ''))), 'B')
) STORED;
--> statement-breakpoint
CREATE INDEX "idx_pois_search" ON "map"."points_of_interest" USING gin("search_vector");