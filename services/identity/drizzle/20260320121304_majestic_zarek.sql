ALTER TYPE "identity"."user_role" ADD VALUE IF NOT EXISTS 'moderator' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "identity"."user_role" ADD VALUE IF NOT EXISTS 'reviewer' BEFORE 'admin';