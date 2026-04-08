ALTER TYPE "identity"."wallet_ledger_ref_type" ADD VALUE IF NOT EXISTS 'deduction';--> statement-breakpoint
DROP INDEX IF EXISTS "identity"."idx_wallet_ledger_ref_type";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_ledger_user_ref" ON "identity"."wallet_ledger" USING btree ("user_id", "ref_id");