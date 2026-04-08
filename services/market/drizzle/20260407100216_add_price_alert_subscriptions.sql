CREATE TYPE "market"."alert_direction" AS ENUM('above', 'below');--> statement-breakpoint
CREATE TABLE "market"."price_alert_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"threshold_price" integer NOT NULL,
	"direction" "market"."alert_direction" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_alert_subscriptions_user_id_commodity_id_direction_unique" UNIQUE("user_id","commodity_id","direction")
);
--> statement-breakpoint
ALTER TABLE "market"."price_alert_subscriptions" ADD CONSTRAINT "price_alert_subscriptions_commodity_id_commodities_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "market"."commodities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_price_alert_commodity" ON "market"."price_alert_subscriptions" USING btree ("commodity_id");