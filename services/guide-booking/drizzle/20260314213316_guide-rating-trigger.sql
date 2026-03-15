-- Custom migration: guide rating trigger
-- Recalculates guides.rating_avg and rating_count from guide_reviews

CREATE OR REPLACE FUNCTION "guide_booking".update_guide_rating()
RETURNS TRIGGER AS $$
DECLARE
  guide_ids_to_update uuid[];
  gid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    guide_ids_to_update := ARRAY[NEW.guide_id];
  ELSIF TG_OP = 'DELETE' THEN
    guide_ids_to_update := ARRAY[OLD.guide_id];
  ELSIF TG_OP = 'UPDATE' THEN
    guide_ids_to_update := ARRAY[NEW.guide_id];
    IF OLD.guide_id IS DISTINCT FROM NEW.guide_id THEN
      guide_ids_to_update := array_append(guide_ids_to_update, OLD.guide_id);
    END IF;
  END IF;

  FOREACH gid IN ARRAY guide_ids_to_update
  LOOP
    UPDATE "guide_booking"."guides"
    SET
      rating_avg = COALESCE(sub.avg_rating, 0),
      rating_count = COALESCE(sub.review_count, 0),
      updated_at = now()
    FROM (
      SELECT
        AVG(rating)::real AS avg_rating,
        COUNT(*)::integer AS review_count
      FROM "guide_booking"."guide_reviews"
      WHERE guide_id = gid AND is_active = true
    ) sub
    WHERE id = gid
      AND (rating_avg IS DISTINCT FROM COALESCE(sub.avg_rating, 0)
        OR rating_count IS DISTINCT FROM COALESCE(sub.review_count, 0));
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Only fires when rating-relevant columns change
DROP TRIGGER IF EXISTS trg_guide_reviews_rating ON "guide_booking"."guide_reviews";
CREATE TRIGGER trg_guide_reviews_rating
  AFTER INSERT OR UPDATE OF rating, is_active, guide_id OR DELETE
  ON "guide_booking"."guide_reviews"
  FOR EACH ROW
  EXECUTE FUNCTION "guide_booking".update_guide_rating();
