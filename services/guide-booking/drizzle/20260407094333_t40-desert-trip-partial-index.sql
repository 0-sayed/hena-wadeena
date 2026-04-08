-- Custom SQL migration file, put your code below! --

-- Custom: partial index for overdue cron query
CREATE INDEX IF NOT EXISTS idx_desert_trips_pending_overdue
  ON guide_booking.desert_trips (expected_arrival_at)
  WHERE status IN ('pending', 'overdue') AND alert_triggered_at IS NULL;