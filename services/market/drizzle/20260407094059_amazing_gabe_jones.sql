CREATE TYPE "market"."well_area" AS ENUM('kharga', 'dakhla', 'farafra', 'baris', 'balat');--> statement-breakpoint
CREATE TABLE "market"."well_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"farmer_id" uuid NOT NULL,
	"location" geometry(point),
	"area" "market"."well_area" NOT NULL,
	"pump_hours" numeric(6, 2) NOT NULL,
	"kwh_consumed" numeric(8, 2) NOT NULL,
	"cost_piasters" integer NOT NULL,
	"water_m3_est" numeric(8, 2),
	"depth_to_water_m" numeric(6, 1),
	"logged_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_well_logs_farmer_id" ON "market"."well_logs" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "idx_well_logs_area" ON "market"."well_logs" USING btree ("area");--> statement-breakpoint
CREATE INDEX "idx_well_logs_logged_at" ON "market"."well_logs" USING btree ("logged_at");