-- Custom SQL migration file, put your code below! --

-- The cron now keeps 'overdue' trips retryable (alertTriggeredAt stays NULL on publish failure).
-- Widen the partial index to cover both 'pending' and 'overdue' rows so the cron query
-- stays efficient on both statuses.
DROP INDEX IF EXISTS guide_booking.idx_desert_trips_pending_overdue;

CREATE INDEX idx_desert_trips_pending_overdue
  ON guide_booking.desert_trips (expected_arrival_at)
  WHERE status IN ('pending', 'overdue') AND alert_triggered_at IS NULL;