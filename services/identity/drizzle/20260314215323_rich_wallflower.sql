ALTER TABLE "identity"."audit_events" DROP CONSTRAINT "audit_events_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "identity"."auth_tokens" DROP CONSTRAINT "auth_tokens_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "identity"."audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;