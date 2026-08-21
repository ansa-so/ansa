ALTER TABLE "email_channel_settings" ALTER COLUMN "enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "recap_frequency" SET DEFAULT 'daily';--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "customer_phone" text;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "email_mismatch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "last_retry_at" timestamp;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "slack_notified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD COLUMN "email_notified" boolean DEFAULT false NOT NULL;