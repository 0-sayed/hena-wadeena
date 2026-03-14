-- Custom migration: guide rating trigger
-- Recalculates guides.rating_avg and rating_count from guide_reviews

CREATE OR REPLACE FUNCTION "guide_booking".update_guide_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_guide_id uuid;
BEGIN
  -- Determine which guide to update
  IF TG_OP = 'DELETE' THEN
    target_guide_id := OLD.guide_id;
  ELSE
    target_guide_id := NEW.guide_id;
  END IF;

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
    WHERE guide_id = target_guide_id AND is_active = true
  ) sub
  WHERE id = target_guide_id
    AND (rating_avg IS DISTINCT FROM COALESCE(sub.avg_rating, 0)
      OR rating_count IS DISTINCT FROM COALESCE(sub.review_count, 0));

  -- Handle old guide on guide_id change
  IF TG_OP = 'UPDATE' AND OLD.guide_id IS DISTINCT FROM NEW.guide_id THEN
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
      WHERE guide_id = OLD.guide_id AND is_active = true
    ) sub
    WHERE id = OLD.guide_id
      AND (rating_avg IS DISTINCT FROM COALESCE(sub.avg_rating, 0)
        OR rating_count IS DISTINCT FROM COALESCE(sub.review_count, 0));
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Only fires when rating-relevant columns change
CREATE TRIGGER trg_guide_reviews_rating
  AFTER INSERT OR UPDATE OF rating, is_active, guide_id OR DELETE
  ON "guide_booking"."guide_reviews"
  FOR EACH ROW
  EXECUTE FUNCTION "guide_booking".update_guide_rating();
