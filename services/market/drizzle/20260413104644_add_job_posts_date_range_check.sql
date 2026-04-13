ALTER TABLE "market"."job_posts" ADD CONSTRAINT "job_posts_valid_date_range" CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at);
