DROP INDEX "identity"."idx_wallet_ledger_booking_id";--> statement-breakpoint
DROP INDEX "identity"."idx_wallet_ledger_kind";--> statement-breakpoint
DROP INDEX "identity"."idx_wallet_ledger_user_booking";--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" DROP COLUMN "booking_id";--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" DROP COLUMN "kind";--> statement-breakpoint
DROP TYPE "identity"."wallet_ledger_kind";--> statement-breakpoint
CREATE TYPE "identity"."wallet_ledger_ref_type" AS ENUM('booking', 'job', 'topup', 'refund');--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" ADD COLUMN "ref_id" uuid;--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" ADD COLUMN "ref_type" "identity"."wallet_ledger_ref_type" NOT NULL DEFAULT 'booking';--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" ALTER COLUMN "ref_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" ADD COLUMN "note_ar" text;--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_ref_id" ON "identity"."wallet_ledger" USING btree ("ref_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_ref_type" ON "identity"."wallet_ledger" USING btree ("ref_type");
