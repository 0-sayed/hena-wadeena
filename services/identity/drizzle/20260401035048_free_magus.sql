DROP INDEX "identity"."idx_users_full_name_trgm";--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "balance_piasters" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_full_name_trgm" ON "identity"."users" USING gin (identity.normalize_arabic("full_name") public.gin_trgm_ops);