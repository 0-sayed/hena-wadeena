-- Custom SQL migration file, put your code below! --

-- Partial index for overdue cron query: only 'pending' rows without an alert yet.
-- 'overdue' excluded because the cron sets alert_triggered_at before transitioning status.
CREATE INDEX idx_desert_trips_pending_overdue
  ON guide_booking.desert_trips (expected_arrival_at)
  WHERE status = 'pending' AND alert_triggered_at IS NULL;