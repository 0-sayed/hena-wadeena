-- Recover deployments where the migration journal advanced but the well_logs
-- table was never created, then add the missing non-negative constraints.
DO $$
BEGIN
  CREATE TYPE "market"."well_area" AS ENUM('kharga', 'dakhla', 'farafra', 'baris', 'balat');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market"."well_logs" (
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
CREATE INDEX IF NOT EXISTS "idx_well_logs_farmer_id" ON "market"."well_logs" USING btree ("farmer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_well_logs_area" ON "market"."well_logs" USING btree ("area");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_well_logs_logged_at" ON "market"."well_logs" USING btree ("logged_at");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_well_logs_pump_hours_non_neg'
      AND conrelid = 'market.well_logs'::regclass
  ) THEN
    ALTER TABLE "market"."well_logs"
      ADD CONSTRAINT "chk_well_logs_pump_hours_non_neg"
      CHECK ("market"."well_logs"."pump_hours" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_well_logs_kwh_consumed_non_neg'
      AND conrelid = 'market.well_logs'::regclass
  ) THEN
    ALTER TABLE "market"."well_logs"
      ADD CONSTRAINT "chk_well_logs_kwh_consumed_non_neg"
      CHECK ("market"."well_logs"."kwh_consumed" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_well_logs_cost_piasters_non_neg'
      AND conrelid = 'market.well_logs'::regclass
  ) THEN
    ALTER TABLE "market"."well_logs"
      ADD CONSTRAINT "chk_well_logs_cost_piasters_non_neg"
      CHECK ("market"."well_logs"."cost_piasters" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_well_logs_water_m3_est_non_neg'
      AND conrelid = 'market.well_logs'::regclass
  ) THEN
    ALTER TABLE "market"."well_logs"
      ADD CONSTRAINT "chk_well_logs_water_m3_est_non_neg"
      CHECK ("market"."well_logs"."water_m3_est" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_well_logs_depth_to_water_m_non_neg'
      AND conrelid = 'market.well_logs'::regclass
  ) THEN
    ALTER TABLE "market"."well_logs"
      ADD CONSTRAINT "chk_well_logs_depth_to_water_m_non_neg"
      CHECK ("market"."well_logs"."depth_to_water_m" >= 0);
  END IF;
END
$$;
