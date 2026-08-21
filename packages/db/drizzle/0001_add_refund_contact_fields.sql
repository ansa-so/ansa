-- Add customer contact fields for escalation follow-up
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "customer_name" text;

--> statement-breakpoint
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "customer_email" text;

--> statement-breakpoint
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "customer_phone" text;

--> statement-breakpoint
-- Add error tracking for failed refunds
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "error_message" text;

--> statement-breakpoint
-- Add retry rate limiting (max 3 retries, 1-min cooldown)
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "retry_count" integer DEFAULT 0 NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "last_retry_at" timestamp;

--> statement-breakpoint
-- Add notification tracking
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "slack_notified" boolean DEFAULT false NOT NULL;

--> statement-breakpoint
ALTER TABLE
  "shopify_refund_requests"
ADD
  COLUMN "email_notified" boolean DEFAULT false NOT NULL;
