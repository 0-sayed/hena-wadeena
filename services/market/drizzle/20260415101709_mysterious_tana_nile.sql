DO $$ BEGIN
  CREATE TYPE "market"."news_category" AS ENUM('announcement', 'tourism', 'investment', 'agriculture', 'infrastructure', 'culture', 'events');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market"."news_articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title_ar" text NOT NULL,
	"summary_ar" text NOT NULL,
	"content_ar" text NOT NULL,
	"slug" text NOT NULL,
	"category" "market"."news_category" NOT NULL,
	"cover_image" text,
	"author_id" uuid,
	"author_name" text NOT NULL,
	"reading_time_minutes" integer DEFAULT 1 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "news_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "market"."job_posts" DROP CONSTRAINT IF EXISTS "job_posts_valid_date_range";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_category_published" ON "market"."news_articles" USING btree ("category","is_published","published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_news_deleted_at" ON "market"."news_articles" USING btree ("deleted_at");
--> statement-breakpoint
ALTER TABLE "market"."job_posts" ADD CONSTRAINT "job_posts_valid_date_range" CHECK ("market"."job_posts"."starts_at" IS NULL OR "market"."job_posts"."ends_at" IS NULL OR "market"."job_posts"."ends_at" >= "market"."job_posts"."starts_at");
