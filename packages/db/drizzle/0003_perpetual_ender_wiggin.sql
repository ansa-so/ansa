CREATE TABLE "shopify_compliance_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid,
	"shop_domain" text NOT NULL,
	"action" text NOT NULL,
	"shopify_customer_id" text,
	"customer_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"data_export_url" text,
	"data_export_expires_at" timestamp,
	"error_message" text,
	"request_payload" json,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopify_compliance_audit_log" ADD CONSTRAINT "shopify_compliance_audit_log_shop_id_shopify_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shopify_shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopify_compliance_shop_idx" ON "shopify_compliance_audit_log" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shopify_compliance_action_idx" ON "shopify_compliance_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "shopify_compliance_status_idx" ON "shopify_compliance_audit_log" USING btree ("status");