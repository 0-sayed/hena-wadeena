DROP INDEX "identity"."idx_users_full_name_trgm";--> statement-breakpoint
CREATE INDEX "idx_users_full_name_trgm" ON "identity"."users" USING gin (identity.normalize_arabic("full_name") gin_trgm_ops);