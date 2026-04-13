commit 7886daf1eae29717306e09c05c82f0432123db31
Author: 0-sayed <sayed.ashraf@inframodern.com>
Date:   Mon Apr 13 07:20:50 2026 +0200

    untracked files on worktree-t36-employment-board: b804f89 Merge pull request #109 from 0-sayed/worktree-t49-well-cost-monitor

diff --git a/services/market/drizzle/20260413041105_t36-employment-board.sql b/services/market/drizzle/20260413041105_t36-employment-board.sql
new file mode 100644
index 0000000..ff13f7a
--- /dev/null
+++ b/services/market/drizzle/20260413041105_t36-employment-board.sql
@@ -0,0 +1,68 @@
+CREATE TYPE "market"."compensation_type" AS ENUM('fixed', 'daily', 'per_kg', 'negotiable');--> statement-breakpoint
+CREATE TYPE "market"."job_application_status" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn', 'in_progress', 'completed');--> statement-breakpoint
+CREATE TYPE "market"."job_category" AS ENUM('agriculture', 'tourism', 'skilled_trade', 'domestic', 'logistics', 'handicraft');--> statement-breakpoint
+CREATE TYPE "market"."job_status" AS ENUM('open', 'in_progress', 'completed', 'cancelled', 'expired');--> statement-breakpoint
+CREATE TYPE "market"."review_direction" AS ENUM('worker_rates_poster', 'poster_rates_worker');--> statement-breakpoint
+CREATE TABLE "market"."job_applications" (
+	"id" uuid PRIMARY KEY NOT NULL,
+	"job_id" uuid NOT NULL,
+	"applicant_id" uuid NOT NULL,
+	"note_ar" text,
+	"status" "market"."job_application_status" DEFAULT 'pending' NOT NULL,
+	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"resolved_at" timestamp with time zone,
+	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
+	CONSTRAINT "job_applications_applicant_job_unique" UNIQUE("applicant_id","job_id")
+);
+--> statement-breakpoint
+CREATE TABLE "market"."job_posts" (
+	"id" uuid PRIMARY KEY NOT NULL,
+	"poster_id" uuid NOT NULL,
+	"title" text NOT NULL,
+	"description_ar" text NOT NULL,
+	"description_en" text,
+	"category" "market"."job_category" NOT NULL,
+	"area" text NOT NULL,
+	"compensation" integer NOT NULL,
+	"compensation_type" "market"."compensation_type" NOT NULL,
+	"slots" integer DEFAULT 1 NOT NULL,
+	"status" "market"."job_status" DEFAULT 'open' NOT NULL,
+	"starts_at" timestamp with time zone,
+	"ends_at" timestamp with time zone,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"deleted_at" timestamp with time zone,
+	CONSTRAINT "job_posts_compensation_non_negative" CHECK ("market"."job_posts"."compensation" >= 0),
+	CONSTRAINT "job_posts_slots_positive" CHECK ("market"."job_posts"."slots" >= 1)
+);
+--> statement-breakpoint
+CREATE TABLE "market"."job_reviews" (
+	"id" uuid PRIMARY KEY NOT NULL,
+	"job_id" uuid NOT NULL,
+	"application_id" uuid NOT NULL,
+	"reviewer_id" uuid NOT NULL,
+	"reviewee_id" uuid NOT NULL,
+	"direction" "market"."review_direction" NOT NULL,
+	"rating" integer NOT NULL,
+	"comment" text,
+	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
+	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
+	CONSTRAINT "job_reviews_rating_range" CHECK ("market"."job_reviews"."rating" >= 1 AND "market"."job_reviews"."rating" <= 5)
+);
+--> statement-breakpoint
+ALTER TABLE "market"."job_applications" ADD CONSTRAINT "job_applications_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "market"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "market"."job_reviews" ADD CONSTRAINT "job_reviews_job_id_job_posts_id_fk" FOREIGN KEY ("job_id") REFERENCES "market"."job_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
+ALTER TABLE "market"."job_reviews" ADD CONSTRAINT "job_reviews_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "market"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
+CREATE INDEX "idx_job_applications_job_id" ON "market"."job_applications" USING btree ("job_id");--> statement-breakpoint
+CREATE INDEX "idx_job_applications_applicant_id" ON "market"."job_applications" USING btree ("applicant_id");--> statement-breakpoint
+CREATE INDEX "idx_job_applications_status" ON "market"."job_applications" USING btree ("status");--> statement-breakpoint
+CREATE INDEX "idx_job_applications_applied_at" ON "market"."job_applications" USING btree ("applied_at" DESC NULLS LAST);--> statement-breakpoint
+CREATE INDEX "idx_job_posts_poster_id" ON "market"."job_posts" USING btree ("poster_id");--> statement-breakpoint
+CREATE INDEX "idx_job_posts_status" ON "market"."job_posts" USING btree ("status");--> statement-breakpoint
+CREATE INDEX "idx_job_posts_category" ON "market"."job_posts" USING btree ("category");--> statement-breakpoint
+CREATE INDEX "idx_job_posts_area" ON "market"."job_posts" USING btree ("area");--> statement-breakpoint
+CREATE INDEX "idx_job_posts_created_at" ON "market"."job_posts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
+CREATE UNIQUE INDEX "job_reviews_application_direction_unique" ON "market"."job_reviews" USING btree ("application_id","direction");--> statement-breakpoint
+CREATE INDEX "idx_job_reviews_reviewer_id" ON "market"."job_reviews" USING btree ("reviewer_id");--> statement-breakpoint
+CREATE INDEX "idx_job_reviews_reviewee_id" ON "market"."job_reviews" USING btree ("reviewee_id");--> statement-breakpoint
+CREATE INDEX "idx_job_reviews_created_at" ON "market"."job_reviews" USING btree ("created_at" DESC NULLS LAST);
\ No newline at end of file
