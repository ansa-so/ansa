CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_escalation_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"show_buttons_after" text DEFAULT 'on_human_request' NOT NULL,
	"show_after_message_count" integer DEFAULT 3,
	"auto_escalate_on_low_confidence" boolean DEFAULT false NOT NULL,
	"confidence_threshold" integer DEFAULT 50,
	"notification_method" text DEFAULT 'email' NOT NULL,
	"notification_config" json,
	"default_priority" text DEFAULT 'medium' NOT NULL,
	"default_assignee_id" text,
	"sla_config" json,
	"widget_auto_close_minutes" integer DEFAULT 60,
	"email_auto_close_minutes" integer DEFAULT 2880,
	"widget_confidence_threshold" integer DEFAULT 50,
	"widget_low_confidence_action" text DEFAULT 'respond',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_escalation_settings_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"source_template_id" uuid,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"input_schema" json NOT NULL,
	"execution_type" text DEFAULT 'mock' NOT NULL,
	"http_url" text,
	"http_method" text,
	"http_headers" json,
	"mock_response" text,
	"form_schema" json,
	"form_execution_mode" text,
	"form_webhook_url" text,
	"form_client_handler" text,
	"form_post_actions" json,
	"display_config" json,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"allow_ai_suggest" boolean DEFAULT true NOT NULL,
	"counts_as_conversion" boolean DEFAULT false NOT NULL,
	"counts_as_resolution" boolean DEFAULT false NOT NULL,
	"category" text DEFAULT 'custom' NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"integration_source" text,
	"integration_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ai_quality" text DEFAULT 'balanced' NOT NULL,
	"temperature" integer DEFAULT 50 NOT NULL,
	"system_prompt" text DEFAULT 'You are a helpful assistant.' NOT NULL,
	"persona" text DEFAULT 'default' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_country_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"country_code" text NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"thumbs_up_count" integer DEFAULT 0 NOT NULL,
	"thumbs_down_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_page_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"page_domain" text NOT NULL,
	"page_path" text NOT NULL,
	"conversation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_tool_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"tool_name" text NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"total_execution_time_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_trigger_daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"trigger_id" uuid,
	"trigger_name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"fired_count" integer DEFAULT 0 NOT NULL,
	"converted_count" integer DEFAULT 0 NOT NULL,
	"unique_sessions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"confidence_score" integer,
	"is_human_response" boolean DEFAULT false,
	"is_sent" boolean DEFAULT true NOT NULL,
	"improved_from_id" uuid,
	"tool_blocks" json,
	"metadata" json,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" text,
	"title" text,
	"channel" text DEFAULT 'widget' NOT NULL,
	"country_code" text,
	"language" text,
	"page_url" text,
	"page_domain" text,
	"page_path" text,
	"visitor_id" text,
	"user_metadata" json,
	"last_product_handle" text,
	"status" text DEFAULT 'open' NOT NULL,
	"needs_attention" boolean DEFAULT false NOT NULL,
	"resolution" text,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to_id" text,
	"assigned_at" timestamp,
	"resolved_at" timestamp,
	"first_human_response_at" timestamp,
	"internal_note" text,
	"ai_response_count" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_channel_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"inbound_address" text NOT NULL,
	"reply_address" text,
	"display_name" text DEFAULT 'AI Assistant' NOT NULL,
	"alert_contact" text,
	"disclaimer_enabled" boolean DEFAULT true NOT NULL,
	"disclaimer_text" text DEFAULT 'This response was composed by an AI assistant.',
	"signature" text,
	"subject_prefix" text,
	"include_original" boolean DEFAULT true NOT NULL,
	"cc_address" text,
	"allowed_domains" json DEFAULT '[]'::json,
	"blocked_senders" json DEFAULT '[]'::json,
	"auto_learn_enabled" boolean DEFAULT false NOT NULL,
	"confidence_threshold" integer DEFAULT 70,
	"low_confidence_action" text DEFAULT 'escalate',
	"forward_to_email" text,
	"thread_creation_mode" text DEFAULT 'always' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_channel_settings_agent_id_unique" UNIQUE("agent_id"),
	CONSTRAINT "email_channel_settings_inbound_address_unique" UNIQUE("inbound_address")
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"sender_email" text NOT NULL,
	"conversation_id" uuid NOT NULL,
	"last_message_id" text,
	"subject" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"escalation_source" text NOT NULL,
	"assigned_to_id" text,
	"assigned_at" timestamp,
	"assigned_by_id" text,
	"sla_deadline" timestamp,
	"sla_broken_at" timestamp,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"resolved_by_id" text,
	"escalated_by" text,
	"resolved_by" text,
	"resolution_note" text,
	"notification_sent_at" timestamp,
	"escalated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid NOT NULL,
	"conversation_id" uuid,
	"agent_id" uuid NOT NULL,
	"form_data" json NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"webhook_attempts" integer DEFAULT 0 NOT NULL,
	"webhook_last_attempt" timestamp,
	"webhook_next_retry" timestamp,
	"webhook_error" text,
	"webhook_response" json,
	"form_impression_at" timestamp,
	"form_started_at" timestamp,
	"form_submitted_at" timestamp,
	"fields_completed" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interface_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"primary_color" text DEFAULT '#3b82f6' NOT NULL,
	"chat_bubble_color" text DEFAULT '#3b82f6' NOT NULL,
	"chat_bubble_align" text DEFAULT 'right' NOT NULL,
	"display_name" text DEFAULT 'AI Assistant' NOT NULL,
	"profile_picture" text,
	"widget_button_color" text DEFAULT '#3b82f6' NOT NULL,
	"widget_button_icon" text,
	"widget_button_icon_type" text,
	"widget_button_border_radius" text DEFAULT '50%' NOT NULL,
	"default_language" text DEFAULT 'en' NOT NULL,
	"initial_message" text DEFAULT 'Hello! How can I help you today?',
	"suggested_messages" json DEFAULT '[]'::json,
	"message_placeholder" text DEFAULT 'Type a message...',
	"footer_message" text,
	"dismissible_message" text,
	"welcome_bubbles" json DEFAULT '[]'::json,
	"positive_feedback_prompt" text DEFAULT 'That answered my question',
	"request_human_prompt" text DEFAULT 'Connect to an agent 👤',
	"human_support_confirmation" text DEFAULT 'Your request has been forwarded to our human support team. They will respond soon.',
	"escalation_notice_message" text DEFAULT 'We don''t have an exact response to your question, but we''ve escalated your message to our team. A human agent will respond soon.',
	"user_escalation_message" text DEFAULT 'The conversation has been escalated. A human will respond soon.',
	"deescalation_message" text DEFAULT 'The conversation has been transferred to an AI.',
	"collect_user_feedback" boolean DEFAULT true NOT NULL,
	"show_satisfaction_on_resolved" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interface_settings_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "interface_settings_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interface_settings_id" uuid NOT NULL,
	"language_code" text NOT NULL,
	"display_name" text,
	"initial_message" text,
	"suggested_messages" json,
	"message_placeholder" text,
	"dismissible_message" text,
	"welcome_bubbles" json,
	"positive_feedback_prompt" text,
	"request_human_prompt" text,
	"human_support_confirmation" text,
	"escalation_notice_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_retrieval_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"chunk_id" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"conversation_id" uuid,
	"message_id" uuid,
	"model" text NOT NULL,
	"tier" text DEFAULT 'balanced' NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cost_cents" numeric(10, 3) NOT NULL,
	"cost_input_cents" numeric(10, 3) NOT NULL,
	"cost_output_cents" numeric(10, 3) NOT NULL,
	"channel" text NOT NULL,
	"is_tool_followup" boolean DEFAULT false NOT NULL,
	"was_upgraded" boolean DEFAULT false NOT NULL,
	"original_tier" text,
	"billing_period_start" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"feedback" text NOT NULL,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_channel_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"confidence_threshold" integer DEFAULT 70,
	"low_confidence_action" text DEFAULT 'escalate',
	"forward_to_email" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messenger_channel_settings_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "messenger_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"facebook_page_id" text NOT NULL,
	"page_name" text NOT NULL,
	"page_access_token" text NOT NULL,
	"webhook_verify_token" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messenger_pages_facebook_page_id_unique" UNIQUE("facebook_page_id")
);
--> statement-breakpoint
CREATE TABLE "messenger_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"messenger_page_id" uuid NOT NULL,
	"sender_psid" text NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qa_source_id" uuid NOT NULL,
	"question" text NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"questions" json NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"cluster_date" timestamp NOT NULL,
	"window_days" integer DEFAULT 90 NOT NULL,
	"representative_question_id" uuid NOT NULL,
	"member_question_ids" json NOT NULL,
	"conversation_count" integer NOT NULL,
	"conversion_count" integer NOT NULL,
	"conversion_rate" integer NOT NULL,
	"avg_confidence_score" integer,
	"most_recent_question_id" uuid,
	"highest_converting_question_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieval_traces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turn_id" uuid NOT NULL,
	"assistant_message_id" uuid NOT NULL,
	"confidence_score" integer,
	"retrieval_mode" text NOT NULL,
	"top_k" integer NOT NULL,
	"sources_used_count" integer NOT NULL,
	"no_context_reason" text,
	"retrieved_chunks" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"message_limit" integer DEFAULT 100 NOT NULL,
	"message_limit_window" integer DEFAULT 60 NOT NULL,
	"allowed_domains" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "security_settings_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shopify_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"shopify_customer_id" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"orders_count" integer DEFAULT 0,
	"total_spent" text,
	"currency" text,
	"tags" json DEFAULT '[]'::json,
	"note" text,
	"accepts_marketing" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"shopify_created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shopify_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"shopify_order_id" text NOT NULL,
	"order_number" text NOT NULL,
	"customer_email" text,
	"customer_id" uuid,
	"financial_status" text,
	"fulfillment_status" text,
	"total_price" text NOT NULL,
	"subtotal_price" text,
	"total_tax" text,
	"total_shipping" text,
	"currency" text DEFAULT 'USD',
	"line_items" json,
	"shipping_address" json,
	"tracking_number" text,
	"tracking_url" text,
	"tracking_company" text,
	"cancelled_at" timestamp,
	"closed_at" timestamp,
	"shopify_created_at" timestamp NOT NULL,
	"shopify_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"shopify_product_id" text NOT NULL,
	"title" text NOT NULL,
	"handle" text,
	"description" text,
	"vendor" text,
	"product_type" text,
	"status" text DEFAULT 'active',
	"tags" json DEFAULT '[]'::json,
	"variants" json,
	"images" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"shopify_created_at" timestamp,
	"shopify_updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shopify_refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"conversation_id" uuid,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"reason" text,
	"line_items" json,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"shopify_refund_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_shop_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"refund_auto_approve_limit" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopify_shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"shop_domain" text NOT NULL,
	"access_token" text NOT NULL,
	"scopes" text NOT NULL,
	"shop_name" text,
	"shop_email" text,
	"currency" text DEFAULT 'USD',
	"timezone" text,
	"script_tag_id" text,
	"identification_script_tag_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"uninstalled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shopify_shops_shop_domain_unique" UNIQUE("shop_domain")
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_id" text NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"member_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "text_source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_source_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "text_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_id" uuid,
	"tool_name" text NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"execution_time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"long_description" text,
	"category" text NOT NULL,
	"icon" text DEFAULT 'wrench' NOT NULL,
	"tool_name" text NOT NULL,
	"tool_description" text NOT NULL,
	"input_schema" json NOT NULL,
	"execution_type" text DEFAULT 'http' NOT NULL,
	"http_url" text,
	"http_method" text DEFAULT 'GET',
	"http_headers" json,
	"mock_response" text,
	"form_schema" json,
	"form_execution_mode" text,
	"form_webhook_url" text,
	"form_client_handler" text,
	"form_post_actions" json,
	"display_config" json,
	"required_config" json,
	"allow_ai_suggest" boolean DEFAULT true NOT NULL,
	"counts_as_conversion" boolean DEFAULT false NOT NULL,
	"counts_as_resolution" boolean DEFAULT false NOT NULL,
	"action_category" text DEFAULT 'custom' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tool_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "trigger_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"trigger_id" uuid,
	"trigger_name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"action_type" text NOT NULL,
	"event_type" text NOT NULL,
	"session_id" text,
	"page_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trigger_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"long_description" text,
	"category" text NOT NULL,
	"icon" text DEFAULT 'zap',
	"trigger_type" text NOT NULL,
	"conditions" json NOT NULL,
	"action_type" text NOT NULL,
	"action_config" json NOT NULL,
	"form_template_slug" text,
	"trigger_once" boolean DEFAULT true,
	"is_free" boolean DEFAULT true,
	"install_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trigger_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"conditions" json NOT NULL,
	"action_type" text NOT NULL,
	"action_config" json NOT NULL,
	"trigger_once" boolean DEFAULT true,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turn_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turn_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_message_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"has_kb_context" boolean DEFAULT false,
	"escalation_intent" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" json,
	"billing_period_start" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recap_frequency" text DEFAULT 'none' NOT NULL,
	"recap_hour" integer DEFAULT 9 NOT NULL,
	"recap_digest_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"billing_provider" text DEFAULT 'stripe' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"shopify_charge_id" text,
	"billing_period_start" timestamp NOT NULL,
	"billing_period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"timezone" text DEFAULT 'UTC',
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_source_page_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"web_source_page_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_source_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"web_source_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"content" text,
	"content_size" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"last_crawled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"name" text,
	"max_pages" integer DEFAULT 100,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_crawled_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_escalation_settings" ADD CONSTRAINT "agent_escalation_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_escalation_settings" ADD CONSTRAINT "agent_escalation_settings_default_assignee_id_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_source_template_id_tool_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."tool_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_country_daily" ADD CONSTRAINT "analytics_country_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_page_daily" ADD CONSTRAINT "analytics_page_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_tool_daily" ADD CONSTRAINT "analytics_tool_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_trigger_daily" ADD CONSTRAINT "analytics_trigger_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_trigger_daily" ADD CONSTRAINT "analytics_trigger_daily_trigger_id_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_channel_settings" ADD CONSTRAINT "email_channel_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_escalated_by_users_id_fk" FOREIGN KEY ("escalated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_tool_id_agent_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."agent_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interface_settings" ADD CONSTRAINT "interface_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interface_settings_translations" ADD CONSTRAINT "interface_settings_translations_interface_settings_id_interface_settings_id_fk" FOREIGN KEY ("interface_settings_id") REFERENCES "public"."interface_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_retrieval_sources" ADD CONSTRAINT "kb_retrieval_sources_trace_id_retrieval_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."retrieval_traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_channel_settings" ADD CONSTRAINT "messenger_channel_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_pages" ADD CONSTRAINT "messenger_pages_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_threads" ADD CONSTRAINT "messenger_threads_messenger_page_id_messenger_pages_id_fk" FOREIGN KEY ("messenger_page_id") REFERENCES "public"."messenger_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_threads" ADD CONSTRAINT "messenger_threads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_source_chunks" ADD CONSTRAINT "qa_source_chunks_qa_source_id_qa_sources_id_fk" FOREIGN KEY ("qa_source_id") REFERENCES "public"."qa_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_sources" ADD CONSTRAINT "qa_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_clusters" ADD CONSTRAINT "question_clusters_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_clusters" ADD CONSTRAINT "question_clusters_representative_question_id_chat_messages_id_fk" FOREIGN KEY ("representative_question_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_clusters" ADD CONSTRAINT "question_clusters_most_recent_question_id_chat_messages_id_fk" FOREIGN KEY ("most_recent_question_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_clusters" ADD CONSTRAINT "question_clusters_highest_converting_question_id_chat_messages_id_fk" FOREIGN KEY ("highest_converting_question_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retrieval_traces" ADD CONSTRAINT "retrieval_traces_turn_id_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."turns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retrieval_traces" ADD CONSTRAINT "retrieval_traces_assistant_message_id_chat_messages_id_fk" FOREIGN KEY ("assistant_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_settings" ADD CONSTRAINT "security_settings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_customers" ADD CONSTRAINT "shopify_customers_shop_id_shopify_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shopify_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_orders" ADD CONSTRAINT "shopify_orders_shop_id_shopify_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shopify_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_orders" ADD CONSTRAINT "shopify_orders_customer_id_shopify_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."shopify_customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_products" ADD CONSTRAINT "shopify_products_shop_id_shopify_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shopify_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD CONSTRAINT "shopify_refund_requests_shop_id_shopify_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shopify_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD CONSTRAINT "shopify_refund_requests_order_id_shopify_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."shopify_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD CONSTRAINT "shopify_refund_requests_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_refund_requests" ADD CONSTRAINT "shopify_refund_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_shop_agents" ADD CONSTRAINT "shopify_shop_agents_shop_id_shopify_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shopify_shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_shop_agents" ADD CONSTRAINT "shopify_shop_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_shops" ADD CONSTRAINT "shopify_shops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_source_chunks" ADD CONSTRAINT "text_source_chunks_text_source_id_text_sources_id_fk" FOREIGN KEY ("text_source_id") REFERENCES "public"."text_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_sources" ADD CONSTRAINT "text_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_executions" ADD CONSTRAINT "tool_executions_tool_id_agent_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."agent_tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_events" ADD CONSTRAINT "trigger_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trigger_events" ADD CONSTRAINT "trigger_events_trigger_id_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triggers" ADD CONSTRAINT "triggers_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn_events" ADD CONSTRAINT "turn_events_turn_id_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."turns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_user_message_id_chat_messages_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_source_page_chunks" ADD CONSTRAINT "web_source_page_chunks_web_source_page_id_web_source_pages_id_fk" FOREIGN KEY ("web_source_page_id") REFERENCES "public"."web_source_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_source_pages" ADD CONSTRAINT "web_source_pages_web_source_id_web_sources_id_fk" FOREIGN KEY ("web_source_id") REFERENCES "public"."web_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_sources" ADD CONSTRAINT "web_sources_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tools_agent_idx" ON "agent_tools" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_tools_source_template_idx" ON "agent_tools" USING btree ("source_template_id");--> statement-breakpoint
CREATE INDEX "agent_tools_category_idx" ON "agent_tools" USING btree ("category");--> statement-breakpoint
CREATE INDEX "agent_tools_system_idx" ON "agent_tools" USING btree ("system");--> statement-breakpoint
CREATE INDEX "agent_tools_integration_idx" ON "agent_tools" USING btree ("integration_source","integration_id");--> statement-breakpoint
CREATE INDEX "analytics_country_idx" ON "analytics_country_daily" USING btree ("agent_id","date","country_code");--> statement-breakpoint
CREATE INDEX "analytics_daily_agent_date_idx" ON "analytics_daily" USING btree ("agent_id","date");--> statement-breakpoint
CREATE INDEX "analytics_page_idx" ON "analytics_page_daily" USING btree ("agent_id","date","page_domain","page_path");--> statement-breakpoint
CREATE INDEX "analytics_tool_daily_idx" ON "analytics_tool_daily" USING btree ("agent_id","date","tool_name");--> statement-breakpoint
CREATE INDEX "analytics_trigger_daily_idx" ON "analytics_trigger_daily" USING btree ("agent_id","date","trigger_id");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_embedding_idx" ON "chat_messages" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_agent_idx" ON "conversations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_assignee_idx" ON "conversations" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "conversations_needs_attention_idx" ON "conversations" USING btree ("needs_attention");--> statement-breakpoint
CREATE INDEX "conversations_last_product_idx" ON "conversations" USING btree ("last_product_handle");--> statement-breakpoint
CREATE INDEX "conversations_ai_response_count_idx" ON "conversations" USING btree ("user_id","ai_response_count");--> statement-breakpoint
CREATE INDEX "embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "email_threads_agent_sender_idx" ON "email_threads" USING btree ("agent_id","sender_email");--> statement-breakpoint
CREATE INDEX "email_threads_agent_sender_subject_idx" ON "email_threads" USING btree ("agent_id","sender_email","subject");--> statement-breakpoint
CREATE INDEX "email_threads_conversation_idx" ON "email_threads" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "escalations_agent_idx" ON "escalations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "escalations_conversation_idx" ON "escalations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "escalations_status_idx" ON "escalations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "escalations_assignee_idx" ON "escalations" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "escalations_sla_idx" ON "escalations" USING btree ("sla_deadline","sla_broken_at");--> statement-breakpoint
CREATE INDEX "form_submissions_tool_idx" ON "form_submissions" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "form_submissions_agent_idx" ON "form_submissions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "form_submissions_conversation_idx" ON "form_submissions" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "form_submissions_status_idx" ON "form_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "form_submissions_webhook_retry_idx" ON "form_submissions" USING btree ("webhook_next_retry");--> statement-breakpoint
CREATE UNIQUE INDEX "interface_settings_translations_unique_idx" ON "interface_settings_translations" USING btree ("interface_settings_id","language_code");--> statement-breakpoint
CREATE INDEX "interface_settings_translations_settings_idx" ON "interface_settings_translations" USING btree ("interface_settings_id");--> statement-breakpoint
CREATE INDEX "kb_retrieval_sources_trace_idx" ON "kb_retrieval_sources" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "kb_retrieval_sources_source_date_idx" ON "kb_retrieval_sources" USING btree ("source_id","created_at");--> statement-breakpoint
CREATE INDEX "kb_retrieval_sources_chunk_idx" ON "kb_retrieval_sources" USING btree ("chunk_id");--> statement-breakpoint
CREATE INDEX "llm_usage_user_period_idx" ON "llm_usage" USING btree ("user_id","billing_period_start");--> statement-breakpoint
CREATE INDEX "llm_usage_agent_date_idx" ON "llm_usage" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "llm_usage_conversation_idx" ON "llm_usage" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "llm_usage_model_idx" ON "llm_usage" USING btree ("model");--> statement-breakpoint
CREATE INDEX "llm_usage_cost_idx" ON "llm_usage" USING btree ("cost_cents");--> statement-breakpoint
CREATE INDEX "message_feedback_message_idx" ON "message_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messenger_pages_agent_idx" ON "messenger_pages" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "messenger_pages_facebook_page_idx" ON "messenger_pages" USING btree ("facebook_page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messenger_threads_page_sender_idx" ON "messenger_threads" USING btree ("messenger_page_id","sender_psid");--> statement-breakpoint
CREATE INDEX "messenger_threads_conversation_idx" ON "messenger_threads" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "qa_source_embedding_idx" ON "qa_source_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "question_clusters_agent_idx" ON "question_clusters" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "question_clusters_date_idx" ON "question_clusters" USING btree ("cluster_date");--> statement-breakpoint
CREATE INDEX "question_clusters_agent_date_idx" ON "question_clusters" USING btree ("agent_id","cluster_date");--> statement-breakpoint
CREATE INDEX "retrieval_traces_turn_idx" ON "retrieval_traces" USING btree ("turn_id");--> statement-breakpoint
CREATE INDEX "retrieval_traces_message_idx" ON "retrieval_traces" USING btree ("assistant_message_id");--> statement-breakpoint
CREATE INDEX "retrieval_traces_created_at_idx" ON "retrieval_traces" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "retrieval_traces_turn_confidence_idx" ON "retrieval_traces" USING btree ("turn_id","confidence_score");--> statement-breakpoint
CREATE INDEX "shopify_customers_shop_idx" ON "shopify_customers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shopify_customers_email_idx" ON "shopify_customers" USING btree ("shop_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_customers_shopify_id_idx" ON "shopify_customers" USING btree ("shop_id","shopify_customer_id");--> statement-breakpoint
CREATE INDEX "shopify_orders_shop_idx" ON "shopify_orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shopify_orders_email_idx" ON "shopify_orders" USING btree ("shop_id","customer_email");--> statement-breakpoint
CREATE INDEX "shopify_orders_number_idx" ON "shopify_orders" USING btree ("shop_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_orders_shopify_id_idx" ON "shopify_orders" USING btree ("shop_id","shopify_order_id");--> statement-breakpoint
CREATE INDEX "shopify_products_shop_idx" ON "shopify_products" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shopify_products_handle_idx" ON "shopify_products" USING btree ("shop_id","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_products_shopify_id_idx" ON "shopify_products" USING btree ("shop_id","shopify_product_id");--> statement-breakpoint
CREATE INDEX "shopify_products_product_type_idx" ON "shopify_products" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "shopify_refund_requests_shop_idx" ON "shopify_refund_requests" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shopify_refund_requests_status_idx" ON "shopify_refund_requests" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "shopify_shop_agents_shop_idx" ON "shopify_shop_agents" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shopify_shop_agents_agent_idx" ON "shopify_shop_agents" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_shop_agents_unique" ON "shopify_shop_agents" USING btree ("shop_id","agent_id");--> statement-breakpoint
CREATE INDEX "shopify_shops_user_idx" ON "shopify_shops" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shopify_shops_domain_idx" ON "shopify_shops" USING btree ("shop_domain");--> statement-breakpoint
CREATE INDEX "team_invitation_email_idx" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "team_invitation_token_idx" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "team_member_owner_idx" ON "team_members" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "team_member_member_idx" ON "team_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "text_source_embedding_idx" ON "text_source_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "tool_executions_agent_idx" ON "tool_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "tool_executions_created_idx" ON "tool_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trigger_events_agent_idx" ON "trigger_events" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "trigger_events_trigger_idx" ON "trigger_events" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "trigger_events_created_idx" ON "trigger_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "triggers_agent_idx" ON "triggers" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "triggers_enabled_idx" ON "triggers" USING btree ("agent_id","is_enabled");--> statement-breakpoint
CREATE INDEX "turn_events_turn_idx" ON "turn_events" USING btree ("turn_id");--> statement-breakpoint
CREATE INDEX "turn_events_type_idx" ON "turn_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "turn_events_created_at_idx" ON "turn_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "turn_events_turn_type_idx" ON "turn_events" USING btree ("turn_id","event_type");--> statement-breakpoint
CREATE INDEX "turns_conversation_idx" ON "turns" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "turns_agent_idx" ON "turns" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "turns_status_idx" ON "turns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "turns_started_at_idx" ON "turns" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "usage_user_period_idx" ON "usage_events" USING btree ("user_id","billing_period_start","event_type");--> statement-breakpoint
CREATE INDEX "web_source_page_chunks_idx" ON "web_source_page_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "web_source_pages_source_idx" ON "web_source_pages" USING btree ("web_source_id");