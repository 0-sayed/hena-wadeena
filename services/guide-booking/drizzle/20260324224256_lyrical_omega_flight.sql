CREATE TABLE "guide_booking"."guide_review_helpful_votes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_review_helpful_votes_user_review_unique" UNIQUE("user_id","review_id")
);
--> statement-breakpoint
ALTER TABLE "guide_booking"."guide_review_helpful_votes" ADD CONSTRAINT "guide_review_helpful_votes_review_id_guide_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "guide_booking"."guide_reviews"("id") ON DELETE no action ON UPDATE no action;