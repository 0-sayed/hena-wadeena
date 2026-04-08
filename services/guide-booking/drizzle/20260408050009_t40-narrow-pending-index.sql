-- Custom SQL migration file, put your code below! --

-- Narrow the overdue cron index: 'overdue' arm is dead weight because the cron
-- sets alert_triggered_at before transitioning status to 'overdue', so those rows
-- are always excluded by the alert_triggered_at IS NULL condition anyway.
DROP INDEX IF EXISTS guide_booking.idx_desert_trips_pending_overdue;

CREATE INDEX idx_desert_trips_pending_overdue
  ON guide_booking.desert_trips (expected_arrival_at)
  WHERE status = 'pending' AND alert_triggered_at IS NULL;