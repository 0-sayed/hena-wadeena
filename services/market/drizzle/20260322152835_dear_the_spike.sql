CREATE TABLE "market"."review_helpful_votes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_helpful_votes_user_review_unique" UNIQUE("user_id","review_id")
);
--> statement-breakpoint
ALTER TABLE "market"."review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "market"."reviews"("id") ON DELETE no action ON UPDATE no action;