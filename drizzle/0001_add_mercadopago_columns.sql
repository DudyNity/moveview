ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "mp_preference_id" text UNIQUE;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "mp_payment_id" text;
