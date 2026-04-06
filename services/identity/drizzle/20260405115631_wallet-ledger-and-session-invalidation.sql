CREATE TYPE "identity"."wallet_ledger_direction" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "identity"."wallet_ledger_kind" AS ENUM('booking_debit', 'booking_refund', 'booking_payout');--> statement-breakpoint
CREATE TABLE "identity"."wallet_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"direction" "identity"."wallet_ledger_direction" NOT NULL,
	"amount_piasters" integer NOT NULL,
	"kind" "identity"."wallet_ledger_kind" NOT NULL,
	"idempotency_key" text NOT NULL,
	"balance_after_piasters" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_wallet_ledger_amount_positive" CHECK ("identity"."wallet_ledger"."amount_piasters" > 0)
);
--> statement-breakpoint
ALTER TABLE "identity"."users" ADD COLUMN "session_invalidated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_ledger_idempotency_key_unique" ON "identity"."wallet_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_user_created_at" ON "identity"."wallet_ledger" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_booking_id" ON "identity"."wallet_ledger" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_kind" ON "identity"."wallet_ledger" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_user_booking" ON "identity"."wallet_ledger" USING btree ("user_id","booking_id");