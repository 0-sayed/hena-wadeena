ALTER TABLE "identity"."wallet_ledger" DROP CONSTRAINT "wallet_ledger_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "identity"."wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE restrict ON UPDATE no action;