ALTER TABLE "market"."well_logs" ADD CONSTRAINT "chk_well_logs_pump_hours_non_neg" CHECK ("market"."well_logs"."pump_hours" >= 0);--> statement-breakpoint
ALTER TABLE "market"."well_logs" ADD CONSTRAINT "chk_well_logs_kwh_consumed_non_neg" CHECK ("market"."well_logs"."kwh_consumed" >= 0);--> statement-breakpoint
ALTER TABLE "market"."well_logs" ADD CONSTRAINT "chk_well_logs_cost_piasters_non_neg" CHECK ("market"."well_logs"."cost_piasters" >= 0);--> statement-breakpoint
ALTER TABLE "market"."well_logs" ADD CONSTRAINT "chk_well_logs_water_m3_est_non_neg" CHECK ("market"."well_logs"."water_m3_est" >= 0);--> statement-breakpoint
ALTER TABLE "market"."well_logs" ADD CONSTRAINT "chk_well_logs_depth_to_water_m_non_neg" CHECK ("market"."well_logs"."depth_to_water_m" >= 0);