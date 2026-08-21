import type { ToolBlockData } from "@ansa/types";
import {
	boolean,
	index,
	integer,
	json,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

// User roles - extensible for future roles
export type UserRole = "user" | "admin";

// BetterAuth tables
export const users = pgTable("users", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name"),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	timezone: text("timezone").default("UTC"), // Auto-detected on signup, e.g. "America/New_York"
	role: text("role").$type<UserRole>().notNull().default("user"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// User preferences for notifications and recap emails
export const userPreferences = pgTable("user_preferences", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	// Recap email settings
	recapFrequency: text("recap_frequency").notNull().default("daily"), // "none" | "daily" | "weekly"
	recapHour: integer("recap_hour").notNull().default(9), // Hour in user's timezone (0-23)
	recapDigestMode: boolean("recap_digest_mode").notNull().default(false), // true = one email with all agents, false = separate emails
	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;

export const accounts = pgTable(
	"accounts",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		issuer: text("issuer").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex("accounts_issuer_account_id_idx").on(table.issuer, table.accountId)],
);

export type Account = typeof accounts.$inferSelect;

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Agents configuration - must be defined before tables that reference it
export const agents = pgTable("agents", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	slug: text("slug").notNull(), // URL-friendly identifier
	aiQuality: text("ai_quality", {
		enum: ["balanced", "high_quality"],
	})
		.notNull()
		.default("balanced"), // AI quality tier (replaces raw model selection)
	temperature: integer("temperature").notNull().default(50), // 0-100 stored as int, divided by 100 for API
	systemPrompt: text("system_prompt").notNull().default("You are a helpful assistant."),
	persona: text("persona", {
		enum: [
			"default",
			"urgent",
			"problem_solver",
			"consultant",
			"sales_expert",
			"playful",
			"inspirational",
			"engaging",
			"informative",
			"professional",
			"neutral",
			"custom",
		],
	})
		.notNull()
		.default("default"),
	isDefault: boolean("is_default").notNull().default(false),
	// AI auto-response toggle - when false, all messages go to human inbox
	aiEnabled: boolean("ai_enabled").notNull().default(true),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

// Agent Tools - function/tool definitions for each agent
export const agentTools = pgTable(
	"agent_tools",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		// Reference to marketplace template (if installed from marketplace)
		sourceTemplateId: uuid("source_template_id").references(() => toolTemplates.id, {
			onDelete: "set null",
		}),

		// Tool definition
		name: text("name").notNull(), // e.g., "get_weather"
		description: text("description").notNull(), // What the tool does
		inputSchema: json("input_schema")
			.$type<{
				type: "object";
				properties: Record<
					string,
					{
						type: string;
						description?: string;
						enum?: string[];
						default?: string | number | boolean | null;
					}
				>;
				required?: string[];
			}>()
			.notNull(),

		// Execution config
		executionType: text("execution_type").notNull().default("mock"), // "mock" | "http" | "form"
		httpUrl: text("http_url"), // URL to call for HTTP type
		httpMethod: text("http_method"), // "GET" | "POST"
		httpHeaders: json("http_headers").$type<Record<string, string>>(), // Headers as key-value
		mockResponse: text("mock_response"), // Static response for mock type

		// Form-specific configuration
		formSchema: json("form_schema").$type<{
			fields: Array<{
				name: string;
				label: string;
				type:
					| "text"
					| "email"
					| "tel"
					| "number"
					| "textarea"
					| "select"
					| "multiselect"
					| "date"
					| "datetime"
					| "file"
					| "image";
				placeholder?: string;
				defaultValue?: string; // Supports template variables: {{user.email}}, {{context.previousResult.field}}
				options?: Array<{ label: string; value: string }>; // For select/multiselect
				validation?: {
					required?: { value: boolean; message: string };
					minLength?: { value: number; message: string };
					maxLength?: { value: number; message: string };
					min?: { value: number; message: string };
					max?: { value: number; message: string };
					pattern?: { value: string; message: string };
				};
			}>;
			introText?: string;
			submitLabel?: string;
			successMessage?: string;
			errorMessage?: string;
		}>(),
		formExecutionMode: text("form_execution_mode"), // "webhook" | "client" | "both"
		formWebhookUrl: text("form_webhook_url"), // URL to POST form data to
		formClientHandler: text("form_client_handler"), // Name of client-side handler function
		// Post-submission actions (Slack, webhook, etc.)
		formPostActions:
			json("form_post_actions").$type<
				Array<
					| {
							type: "webhook";
							url: string;
							headers?: Record<string, string>;
					  }
					| {
							type: "slack";
							webhookUrl: string;
							messageTemplate: string; // Supports {{field}} placeholders
					  }
				>
			>(),

		// Display configuration for rendering tool results in chat
		displayConfig: json("display_config").$type<{
			type:
				| "text"
				| "product_card"
				| "product_carousel"
				| "product_grid"
				| "image"
				| "table"
				| "buttons"
				| "form"
				| "custom";
			fieldMappings?: Record<string, string>; // JSONPath mappings: { "title": "$.product.name" }
			textFallback?: string; // Template for text-only channels: "{{title}} - {{price}}"
			skipFollowUp?: boolean;
			followUpAcknowledgment?: string;
			options?: {
				showPrice?: boolean;
				showImage?: boolean;
				showAddToCart?: boolean;
				maxItems?: number;
				cardStyle?: "compact" | "detailed";
				viewMoreUrl?: string;
				columns?: Array<{ key: string; label: string; width?: string }>;
				buttonStyle?: "primary" | "secondary" | "outline";
				template?: string; // For custom type: {{field}} interpolation
			};
		}>(),

		isEnabled: boolean("is_enabled").notNull().default(true),

		// Action configuration (outcome tracking + AI visibility)
		allowAiSuggest: boolean("allow_ai_suggest").notNull().default(true),
		countsAsConversion: boolean("counts_as_conversion").notNull().default(false),
		countsAsResolution: boolean("counts_as_resolution").notNull().default(false),
		category: text("category").notNull().default("custom"), // "lead_sales" | "support_escalation" | "feedback_survey" | "account_user" | "operations_internal" | "custom"

		// System flag for built-in tools (satisfaction survey, etc.)
		system: boolean("system").notNull().default(false),

		// Integration source for auto-created tools (e.g., "shopify", "stripe")
		integrationSource: text("integration_source"),
		// Optional: ID linking back to the integration (e.g., shopId for Shopify)
		integrationId: text("integration_id"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("agent_tools_agent_idx").on(table.agentId),
		index("agent_tools_source_template_idx").on(table.sourceTemplateId),
		index("agent_tools_category_idx").on(table.category),
		index("agent_tools_system_idx").on(table.system),
		index("agent_tools_integration_idx").on(table.integrationSource, table.integrationId),
	],
);

export type AgentTool = typeof agentTools.$inferSelect;
export type NewAgentTool = typeof agentTools.$inferInsert;
export type DisplayConfig = NonNullable<AgentTool["displayConfig"]>;
export type ToolCategory =
	| "lead_sales"
	| "support_escalation"
	| "feedback_survey"
	| "account_user"
	| "operations_internal"
	| "custom";

// Marketplace Tool Templates - pre-configured tools users can install
export const toolTemplates = pgTable("tool_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	slug: text("slug").notNull().unique(), // URL-friendly identifier

	// Display info
	name: text("name").notNull(), // e.g., "Weather Lookup"
	description: text("description").notNull(), // User-facing description
	longDescription: text("long_description"), // Detailed description for marketplace
	category: text("category").notNull(), // "search" | "productivity" | "communication" | "data" | "ecommerce"
	icon: text("icon").notNull().default("wrench"), // Lucide icon name

	// Tool definition (same structure as agentTools)
	toolName: text("tool_name").notNull(), // e.g., "get_weather"
	toolDescription: text("tool_description").notNull(), // Description for the LLM
	inputSchema: json("input_schema")
		.$type<{
			type: "object";
			properties: Record<
				string,
				{
					type: string;
					description?: string;
					enum?: string[];
					default?: string | number | boolean | null;
				}
			>;
			required?: string[];
		}>()
		.notNull(),

	// Execution config template
	executionType: text("execution_type").notNull().default("http"), // "mock" | "http" | "form"
	httpUrl: text("http_url"), // URL template with ${var} placeholders
	httpMethod: text("http_method").default("GET"),
	httpHeaders: json("http_headers").$type<Record<string, string>>(),
	mockResponse: text("mock_response"),

	// Form-specific configuration (for form templates)
	formSchema: json("form_schema").$type<{
		fields: Array<{
			name: string;
			label: string;
			type:
				| "text"
				| "email"
				| "tel"
				| "number"
				| "textarea"
				| "select"
				| "multiselect"
				| "date"
				| "datetime"
				| "file"
				| "image";
			placeholder?: string;
			defaultValue?: string;
			options?: Array<{ label: string; value: string }>;
			validation?: {
				required?: { value: boolean; message: string };
				minLength?: { value: number; message: string };
				maxLength?: { value: number; message: string };
				min?: { value: number; message: string };
				max?: { value: number; message: string };
				pattern?: { value: string; message: string };
			};
		}>;
		introText?: string;
		submitLabel?: string;
		successMessage?: string;
		errorMessage?: string;
	}>(),
	formExecutionMode: text("form_execution_mode"), // "webhook" | "client" | "both"
	formWebhookUrl: text("form_webhook_url"), // URL to POST form data to
	formClientHandler: text("form_client_handler"), // Name of client-side handler function
	formPostActions:
		json("form_post_actions").$type<
			Array<
				| {
						type: "webhook";
						url: string;
						headers?: Record<string, string>;
				  }
				| {
						type: "slack";
						webhookUrl: string;
						messageTemplate: string;
				  }
			>
		>(),

	// Display configuration for rendering tool results in chat
	displayConfig: json("display_config").$type<{
		type: "text" | "product_card" | "product_carousel" | "image" | "table" | "buttons" | "custom";
		fieldMappings?: Record<string, string>;
		textFallback?: string;
		options?: {
			showPrice?: boolean;
			showImage?: boolean;
			showAddToCart?: boolean;
			columns?: Array<{ key: string; label: string; width?: string }>;
			buttonStyle?: "primary" | "secondary" | "outline";
			template?: string;
		};
	}>(),

	// Configuration requirements - fields the user needs to provide
	requiredConfig:
		json("required_config").$type<
			Array<{
				key: string; // e.g., "api_key"
				label: string; // e.g., "API Key"
				type: "text" | "password" | "url"; // Input type
				placeholder?: string;
				helpText?: string;
				helpUrl?: string; // Link to get API key
			}>
		>(),

	// Action defaults (copied to agentTools when installed)
	allowAiSuggest: boolean("allow_ai_suggest").notNull().default(true),
	countsAsConversion: boolean("counts_as_conversion").notNull().default(false),
	countsAsResolution: boolean("counts_as_resolution").notNull().default(false),
	actionCategory: text("action_category").notNull().default("custom"), // "lead_sales" | "support_escalation" | "feedback_survey" | "account_user" | "operations_internal" | "custom"

	// Metadata
	isActive: boolean("is_active").notNull().default(true),
	isFree: boolean("is_free").notNull().default(true), // Free vs requires paid API
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ToolTemplate = typeof toolTemplates.$inferSelect;
export type NewToolTemplate = typeof toolTemplates.$inferInsert;

export const documents = pgTable("documents", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	filename: text("filename").notNull(),
	mimeType: text("mime_type").notNull(),
	size: integer("size").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export const documentChunks = pgTable(
	"document_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => documents.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops"))],
);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;

// Text Sources for knowledge base
export const textSources = pgTable("text_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	content: text("content").notNull(), // HTML content
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TextSource = typeof textSources.$inferSelect;
export type NewTextSource = typeof textSources.$inferInsert;

export const textSourceChunks = pgTable(
	"text_source_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		textSourceId: uuid("text_source_id")
			.notNull()
			.references(() => textSources.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("text_source_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type TextSourceChunk = typeof textSourceChunks.$inferSelect;
export type NewTextSourceChunk = typeof textSourceChunks.$inferInsert;

// Chat logs
export const conversations = pgTable(
	"conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
		title: text("title"),
		channel: text("channel").default("widget").notNull(), // widget, email, sms, whatsapp, api, etc.
		countryCode: text("country_code"), // ISO 3166-1 alpha-2 from CF-IPCountry header
		language: text("language"), // ISO 639-3 detected language code (e.g., "eng", "spa")
		pageUrl: text("page_url"), // Full URL where conversation started (query params stripped)
		pageDomain: text("page_domain"), // Domain only: example.com
		pagePath: text("page_path"), // Full path: /products/shoes (normalized, no trailing slash)
		// User identity from widget identify() call
		visitorId: text("visitor_id"), // Anonymous visitor ID or authenticated user ID
		userMetadata: json("user_metadata").$type<Record<string, unknown>>(), // Name, email, phone, custom fields
		// Product context tracking for Shopify conversations
		lastProductHandle: text("last_product_handle"), // Last discussed Shopify product handle for context memory
		// Conversation status and assignment for inbox
		status: text("status").notNull().default("open"), // "open" | "pending" | "resolved" | "closed"
		needsAttention: boolean("needs_attention").notNull().default(false), // true if human review needed (low confidence)
		resolution: text("resolution"), // "ai_handled" | "human_handled" | "improved" | null
		lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(), // For auto-close timing
		assignedToId: text("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
		assignedAt: timestamp("assigned_at"),
		resolvedAt: timestamp("resolved_at"),
		firstHumanResponseAt: timestamp("first_human_response_at"), // When first human agent replied
		internalNote: text("internal_note"), // Internal team note about the conversation
		// Rate limiting - track AI responses per conversation
		aiResponseCount: integer("ai_response_count").notNull().default(0), // Number of AI responses in this conversation
		// Widget unread tracking
		lastSeenAt: timestamp("last_seen_at"), // When visitor last viewed the conversation in widget
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("conversations_agent_idx").on(table.agentId),
		index("conversations_status_idx").on(table.status),
		index("conversations_assignee_idx").on(table.assignedToId),
		index("conversations_needs_attention_idx").on(table.needsAttention),
		index("conversations_last_product_idx").on(table.lastProductHandle),
		index("conversations_ai_response_count_idx").on(table.userId, table.aiResponseCount),
	],
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

// Form submissions tracking for form tools
export const formSubmissions = pgTable(
	"form_submissions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		toolId: uuid("tool_id")
			.notNull()
			.references(() => agentTools.id, { onDelete: "cascade" }),
		conversationId: uuid("conversation_id").references(() => conversations.id, {
			onDelete: "set null",
		}),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),

		// Submission data
		formData: json("form_data").$type<Record<string, unknown>>().notNull(),
		status: text("status").notNull().default("pending"), // "pending" | "submitted" | "webhook_success" | "webhook_failed" | "client_success" | "client_failed"

		// Webhook delivery tracking
		webhookAttempts: integer("webhook_attempts").notNull().default(0),
		webhookLastAttempt: timestamp("webhook_last_attempt"),
		webhookNextRetry: timestamp("webhook_next_retry"),
		webhookError: text("webhook_error"),
		webhookResponse: json("webhook_response").$type<unknown>(),

		// Analytics tracking
		formImpressionAt: timestamp("form_impression_at"), // When form was shown
		formStartedAt: timestamp("form_started_at"), // When user started filling
		formSubmittedAt: timestamp("form_submitted_at"), // When user submitted
		fieldsCompleted: json("fields_completed").$type<string[]>(), // Which fields were filled

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("form_submissions_tool_idx").on(table.toolId),
		index("form_submissions_agent_idx").on(table.agentId),
		index("form_submissions_conversation_idx").on(table.conversationId),
		index("form_submissions_status_idx").on(table.status),
		index("form_submissions_webhook_retry_idx").on(table.webhookNextRetry),
	],
);

export type FormSubmission = typeof formSubmissions.$inferSelect;
export type NewFormSubmission = typeof formSubmissions.$inferInsert;

export const chatMessages = pgTable(
	"chat_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		role: text("role").notNull(), // "user" | "assistant"
		content: text("content").notNull(),
		confidenceScore: integer("confidence_score"), // 0-100, nullable (only for assistant messages with RAG)
		isHumanResponse: boolean("is_human_response").default(false), // true if response is from a human reviewer
		isSent: boolean("is_sent").notNull().default(true), // false if AI response was not sent (low confidence)
		improvedFromId: uuid("improved_from_id"), // Links to original message this was improved from
		toolBlocks: json("tool_blocks").$type<ToolBlockData[]>(), // Rich tool results (products, tables, etc.)
		metadata: json("metadata").$type<{
			messageType?: string;
			reason?: string;
			shouldShowEscalation?: boolean;
			escalationIntent?: string;
			// Translation metadata
			originalContent?: string; // Original text before translation
			translatedFrom?: string; // ISO 639-3 code of source language
			translatedTo?: string; // ISO 639-3 code of target language
			// Human responder info
			sentByName?: string; // Name of the team member who sent this message
			sentByEmail?: string; // Email of the team member who sent this message
		}>(), // System message metadata (e.g. escalation_notice, translation info)
		embedding: vector("embedding", { dimensions: 1536 }), // Semantic search for user questions
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("chat_messages_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
		index("chat_messages_conversation_idx").on(table.conversationId),
	],
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// Interface settings (chat widget appearance) - one per agent
export const interfaceSettings = pgTable("interface_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// Theme
	theme: text("theme").notNull().default("system"), // "light" | "dark" | "system"
	primaryColor: text("primary_color").notNull().default("#3b82f6"),
	chatBubbleColor: text("chat_bubble_color").notNull().default("#3b82f6"),
	chatBubbleAlign: text("chat_bubble_align").notNull().default("right"), // "left" | "right"
	// Branding
	displayName: text("display_name").notNull().default("AI Assistant"),
	profilePicture: text("profile_picture"), // URL to uploaded image
	// Widget button customization
	widgetButtonColor: text("widget_button_color").notNull().default("#3b82f6"),
	widgetButtonIcon: text("widget_button_icon"), // Base64, URL, or emoji character
	widgetButtonIconType: text("widget_button_icon_type"), // "upload" | "url" | "emoji" | null
	widgetButtonBorderRadius: text("widget_button_border_radius").notNull().default("28px"), // CSS border-radius value
	// Language settings
	defaultLanguage: text("default_language").notNull().default("en"), // ISO 639-1 code
	// Messages
	initialMessage: text("initial_message").default("Hello! How can I help you today?"),
	suggestedMessages: json("suggested_messages").$type<string[]>().default([]),
	messagePlaceholder: text("message_placeholder").default("Type a message..."),
	footerMessage: text("footer_message"),
	dismissibleMessage: text("dismissible_message"),
	welcomeBubbles: json("welcome_bubbles").$type<string[]>().default([]),
	// Escalation button defaults
	positiveFeedbackPrompt: text("positive_feedback_prompt").default("That answered my question"),
	requestHumanPrompt: text("request_human_prompt").default("Connect to an agent 👤"),
	humanSupportConfirmation: text("human_support_confirmation").default(
		"Your request has been forwarded to our human support team. They will respond soon.",
	),
	// Auto-escalation notice (shown when low-confidence triggers escalation)
	escalationNoticeMessage: text("escalation_notice_message").default(
		"We don't have an exact response to your question, but we've escalated your message to our team. A human agent will respond soon.",
	),
	// Rate limit notice (shown when conversation hits message limit and escalation is disabled)
	rateLimitNoticeMessage: text("rate_limit_notice_message").default(
		"This conversation has reached its message limit. Please start a new conversation for further assistance.",
	),
	// User-requested escalation message (shown when user manually escalates)
	userEscalationMessage: text("user_escalation_message").default(
		"The conversation has been escalated. A human will respond soon.",
	),
	// De-escalation message (shown when conversation is de-escalated back to AI)
	deescalationMessage: text("deescalation_message").default(
		"The conversation has been transferred to an AI.",
	),
	// Features
	collectUserFeedback: boolean("collect_user_feedback").notNull().default(true),
	showSatisfactionOnResolved: boolean("show_satisfaction_on_resolved").notNull().default(true),
	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InterfaceSettings = typeof interfaceSettings.$inferSelect;
export type NewInterfaceSettings = typeof interfaceSettings.$inferInsert;

// Interface settings translations - per-language overrides for widget messages
export const interfaceSettingsTranslations = pgTable(
	"interface_settings_translations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		interfaceSettingsId: uuid("interface_settings_id")
			.notNull()
			.references(() => interfaceSettings.id, { onDelete: "cascade" }),
		// ISO 639-1 language code (e.g., "en", "fr", "es", "de", "zh")
		languageCode: text("language_code").notNull(),
		// Translatable fields (all optional - falls back to default if not set)
		displayName: text("display_name"),
		initialMessage: text("initial_message"),
		suggestedMessages: json("suggested_messages").$type<string[]>(),
		messagePlaceholder: text("message_placeholder"),
		dismissibleMessage: text("dismissible_message"),
		welcomeBubbles: json("welcome_bubbles").$type<string[]>(),
		// Escalation button translations
		positiveFeedbackPrompt: text("positive_feedback_prompt"), // "That answered my question"
		requestHumanPrompt: text("request_human_prompt"), // "Connect to an agent 👤"
		humanSupportConfirmation: text("human_support_confirmation"), // "Your request has been forwarded..."
		escalationNoticeMessage: text("escalation_notice_message"), // Auto-escalation notice
		rateLimitNoticeMessage: text("rate_limit_notice_message"), // Rate limit notice (no escalation)
		// Timestamps
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique constraint: one translation per language per interface settings
		uniqueIndex("interface_settings_translations_unique_idx").on(
			table.interfaceSettingsId,
			table.languageCode,
		),
		// Index for fast lookups by interface settings
		index("interface_settings_translations_settings_idx").on(table.interfaceSettingsId),
	],
);

export type InterfaceSettingsTranslation = typeof interfaceSettingsTranslations.$inferSelect;
export type NewInterfaceSettingsTranslation = typeof interfaceSettingsTranslations.$inferInsert;

// Usage tracking for billing
export const usageEvents = pgTable(
	"usage_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		eventType: text("event_type").notNull(), // "message"
		metadata: json("metadata").$type<Record<string, unknown>>(),
		billingPeriodStart: timestamp("billing_period_start").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("usage_user_period_idx").on(table.userId, table.billingPeriodStart, table.eventType),
	],
);

export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;

// User subscription info cache (synced from Stripe or Shopify)
export const userSubscriptions = pgTable("user_subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	planId: text("plan_id").notNull(), // "starter" | "growth" | "pro" | "free"
	status: text("status").default("active").notNull(), // "active" | "canceled" | "past_due"
	billingProvider: text("billing_provider").default("stripe").notNull(), // "stripe" | "shopify"
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	shopifyChargeId: text("shopify_charge_id"), // Shopify recurring charge ID
	billingPeriodStart: timestamp("billing_period_start").notNull(),
	billingPeriodEnd: timestamp("billing_period_end").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;

// LLM usage tracking for cost analytics
export const llmUsage = pgTable(
	"llm_usage",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		conversationId: uuid("conversation_id").references(() => conversations.id, {
			onDelete: "set null",
		}),
		messageId: uuid("message_id").references(() => chatMessages.id, {
			onDelete: "set null",
		}),
		// Model and tier information
		model: text("model").notNull(), // Actual model used (e.g., "gpt-4o", "claude-opus-4")
		tier: text("tier", {
			enum: ["fast", "balanced", "high_quality"],
		})
			.notNull()
			.default("balanced"), // AI quality tier selected
		// Token usage
		inputTokens: integer("input_tokens").notNull(),
		outputTokens: integer("output_tokens").notNull(),
		// Cost tracking (in cents, with 3 decimal precision)
		costCents: numeric("cost_cents", { precision: 10, scale: 3 }).notNull(),
		costInputCents: numeric("cost_input_cents", { precision: 10, scale: 3 }).notNull(),
		costOutputCents: numeric("cost_output_cents", { precision: 10, scale: 3 }).notNull(),
		// Context
		channel: text("channel").notNull(), // "widget", "email", "api"
		isToolFollowup: boolean("is_tool_followup").notNull().default(false),
		wasUpgraded: boolean("was_upgraded").notNull().default(false), // If model was auto-upgraded
		originalTier: text("original_tier", {
			enum: ["fast", "balanced", "high_quality"],
		}), // Original tier if upgraded
		// Timing
		billingPeriodStart: timestamp("billing_period_start").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("llm_usage_user_period_idx").on(table.userId, table.billingPeriodStart),
		index("llm_usage_agent_date_idx").on(table.agentId, table.createdAt),
		index("llm_usage_conversation_idx").on(table.conversationId),
		index("llm_usage_model_idx").on(table.model),
		index("llm_usage_cost_idx").on(table.costCents),
	],
);

export type LLMUsage = typeof llmUsage.$inferSelect;
export type NewLLMUsage = typeof llmUsage.$inferInsert;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;

// Q&A Knowledge Sources
export const qaSources = pgTable("qa_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	questions: json("questions").$type<string[]>().notNull(), // Multiple trigger questions
	answer: text("answer").notNull(), // Can be HTML
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type QaSource = typeof qaSources.$inferSelect;
export type NewQaSource = typeof qaSources.$inferInsert;

// Q&A embeddings - one chunk per question for better matching
export const qaSourceChunks = pgTable(
	"qa_source_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		qaSourceId: uuid("qa_source_id")
			.notNull()
			.references(() => qaSources.id, { onDelete: "cascade" }),
		question: text("question").notNull(), // The specific question this embedding is for
		content: text("content").notNull(), // Combined "Q: question\nA: answer" for context
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("qa_source_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type QaSourceChunk = typeof qaSourceChunks.$inferSelect;
export type NewQaSourceChunk = typeof qaSourceChunks.$inferInsert;

// Team Invitations
export const teamInvitations = pgTable(
	"team_invitations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		token: text("token").notNull().unique(),
		role: text("role").notNull().default("member"), // "member" | "admin"
		status: text("status").notNull().default("pending"), // "pending" | "accepted" | "expired"
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		acceptedAt: timestamp("accepted_at"),
	},
	(table) => [
		index("team_invitation_email_idx").on(table.email),
		index("team_invitation_token_idx").on(table.token),
	],
);

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;

// Team Members - tracks which users belong to which team (owner's account)
export const teamMembers = pgTable(
	"team_members",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		memberId: text("member_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("member"), // "member" | "admin"
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("team_member_owner_idx").on(table.ownerId),
		index("team_member_member_idx").on(table.memberId),
	],
);

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

// Security Settings - rate limiting and allowed domains
export const securitySettings = pgTable("security_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// Rate limiting
	messageLimit: integer("message_limit").notNull().default(100), // max messages per window
	messageLimitWindow: integer("message_limit_window").notNull().default(60), // window in seconds
	// Domain restrictions
	allowedDomains: json("allowed_domains").$type<string[]>().default([]), // empty = allow all
	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SecuritySettings = typeof securitySettings.$inferSelect;
export type NewSecuritySettings = typeof securitySettings.$inferInsert;

// Message Feedback (thumbs up/down)
export const messageFeedback = pgTable(
	"message_feedback",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => chatMessages.id, { onDelete: "cascade" }),
		feedback: text("feedback").notNull(), // "up" | "down"
		sessionId: text("session_id"), // track anonymous widget users
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("message_feedback_message_idx").on(table.messageId)],
);

export type MessageFeedback = typeof messageFeedback.$inferSelect;
export type NewMessageFeedback = typeof messageFeedback.$inferInsert;

// Analytics daily rollups
export const analyticsDaily = pgTable(
	"analytics_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(), // midnight UTC
		conversationCount: integer("conversation_count").notNull().default(0),
		messageCount: integer("message_count").notNull().default(0),
		thumbsUpCount: integer("thumbs_up_count").notNull().default(0),
		thumbsDownCount: integer("thumbs_down_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_daily_agent_date_idx").on(table.agentId, table.date)],
);

export type AnalyticsDaily = typeof analyticsDaily.$inferSelect;
export type NewAnalyticsDaily = typeof analyticsDaily.$inferInsert;

// Analytics country daily rollups
export const analyticsCountryDaily = pgTable(
	"analytics_country_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),
		countryCode: text("country_code").notNull(), // ISO 3166-1 alpha-2
		conversationCount: integer("conversation_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_country_idx").on(table.agentId, table.date, table.countryCode)],
);

export type AnalyticsCountryDaily = typeof analyticsCountryDaily.$inferSelect;
export type NewAnalyticsCountryDaily = typeof analyticsCountryDaily.$inferInsert;

// Analytics page daily rollups
export const analyticsPageDaily = pgTable(
	"analytics_page_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),
		pageDomain: text("page_domain").notNull(),
		pagePath: text("page_path").notNull(),
		conversationCount: integer("conversation_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("analytics_page_idx").on(table.agentId, table.date, table.pageDomain, table.pagePath),
	],
);

export type AnalyticsPageDaily = typeof analyticsPageDaily.$inferSelect;
export type NewAnalyticsPageDaily = typeof analyticsPageDaily.$inferInsert;

// Tool Executions - raw events for tracking tool usage
export const toolExecutions = pgTable(
	"tool_executions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		toolId: uuid("tool_id").references(() => agentTools.id, { onDelete: "set null" }), // null if tool deleted
		toolName: text("tool_name").notNull(), // denormalized for analytics after deletion
		success: boolean("success").notNull(),
		errorMessage: text("error_message"),
		executionTimeMs: integer("execution_time_ms").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("tool_executions_agent_idx").on(table.agentId),
		index("tool_executions_created_idx").on(table.createdAt),
	],
);

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type NewToolExecution = typeof toolExecutions.$inferInsert;

// Analytics tool daily rollups
export const analyticsToolDaily = pgTable(
	"analytics_tool_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(), // midnight UTC
		toolName: text("tool_name").notNull(),
		executionCount: integer("execution_count").notNull().default(0),
		successCount: integer("success_count").notNull().default(0),
		failureCount: integer("failure_count").notNull().default(0),
		totalExecutionTimeMs: integer("total_execution_time_ms").notNull().default(0), // for computing avg
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_tool_daily_idx").on(table.agentId, table.date, table.toolName)],
);

export type AnalyticsToolDaily = typeof analyticsToolDaily.$inferSelect;
export type NewAnalyticsToolDaily = typeof analyticsToolDaily.$inferInsert;

// Web Sources - websites added for knowledge base
export const webSources = pgTable("web_sources", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.references(() => agents.id, { onDelete: "cascade" }),
	url: text("url").notNull(), // The source URL (individual page, sitemap, or crawl root)
	sourceType: text("source_type").notNull(), // "page" | "sitemap" | "crawl"
	name: text("name"), // Optional display name
	maxPages: integer("max_pages").default(100), // Max pages to crawl for sitemap/crawl types
	status: text("status").notNull().default("pending"), // "pending" | "crawling" | "completed" | "failed"
	lastCrawledAt: timestamp("last_crawled_at"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WebSource = typeof webSources.$inferSelect;
export type NewWebSource = typeof webSources.$inferInsert;

// Web Source Pages - individual pages crawled from a web source
export const webSourcePages = pgTable(
	"web_source_pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		webSourceId: uuid("web_source_id")
			.notNull()
			.references(() => webSources.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		title: text("title"),
		content: text("content"), // Extracted text content
		contentSize: integer("content_size").default(0), // Size in bytes
		status: text("status").notNull().default("pending"), // "pending" | "crawled" | "failed" | "excluded"
		errorMessage: text("error_message"),
		lastCrawledAt: timestamp("last_crawled_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("web_source_pages_source_idx").on(table.webSourceId)],
);

export type WebSourcePage = typeof webSourcePages.$inferSelect;
export type NewWebSourcePage = typeof webSourcePages.$inferInsert;

// Web Source Page Chunks - embeddings for RAG
export const webSourcePageChunks = pgTable(
	"web_source_page_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		webSourcePageId: uuid("web_source_page_id")
			.notNull()
			.references(() => webSourcePages.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("web_source_page_chunks_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	],
);

export type WebSourcePageChunk = typeof webSourcePageChunks.$inferSelect;
export type NewWebSourcePageChunk = typeof webSourcePageChunks.$inferInsert;

// ============ SHOPIFY INTEGRATION ============

// Shopify Shops - stores connected Shopify stores
export const shopifyShops = pgTable(
	"shopify_shops",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		shopDomain: text("shop_domain").notNull().unique(), // e.g., "my-store.myshopify.com"
		accessToken: text("access_token").notNull(), // Shopify API access token
		scopes: text("scopes").notNull(), // Comma-separated scopes granted
		shopName: text("shop_name"), // Display name from Shopify
		shopEmail: text("shop_email"), // Shop owner email
		currency: text("currency").default("USD"),
		timezone: text("timezone"),
		scriptTagId: text("script_tag_id"), // ID of injected widget script tag
		identificationScriptTagId: text("identification_script_tag_id"), // ID of customer identification script tag
		status: text("status").notNull().default("active"), // "active" | "uninstalled" | "frozen"
		lastSyncAt: timestamp("last_sync_at"),
		installedAt: timestamp("installed_at").defaultNow().notNull(),
		uninstalledAt: timestamp("uninstalled_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("shopify_shops_user_idx").on(table.userId),
		index("shopify_shops_domain_idx").on(table.shopDomain),
	],
);

export type ShopifyShop = typeof shopifyShops.$inferSelect;
export type NewShopifyShop = typeof shopifyShops.$inferInsert;

// Shopify Shop Agents - junction table linking shops to agents (multi-agent support)
export const shopifyShopAgents = pgTable(
	"shopify_shop_agents",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shopifyShops.id, { onDelete: "cascade" }),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		isPrimary: boolean("is_primary").notNull().default(false), // Primary agent for storefront widget
		refundAutoApproveLimit: integer("refund_auto_approve_limit").default(0), // Max refund in cents that can be auto-approved (0 = require approval)
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("shopify_shop_agents_shop_idx").on(table.shopId),
		index("shopify_shop_agents_agent_idx").on(table.agentId),
		uniqueIndex("shopify_shop_agents_unique").on(table.shopId, table.agentId),
	],
);

export type ShopifyShopAgent = typeof shopifyShopAgents.$inferSelect;
export type NewShopifyShopAgent = typeof shopifyShopAgents.$inferInsert;

// Shopify Compliance Audit Log - tracks GDPR/CCPA compliance actions
export const shopifyComplianceAuditLog = pgTable(
	"shopify_compliance_audit_log",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id").references(() => shopifyShops.id, { onDelete: "set null" }),
		shopDomain: text("shop_domain").notNull(), // Store domain in case shop is deleted
		action: text("action").notNull(), // "customers/data_request" | "customers/redact" | "shop/redact"
		shopifyCustomerId: text("shopify_customer_id"), // For customer-specific requests
		customerEmail: text("customer_email"), // For reference after deletion
		status: text("status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed"
		dataExportUrl: text("data_export_url"), // S3/storage URL for data request exports
		dataExportExpiresAt: timestamp("data_export_expires_at"), // When the export link expires
		errorMessage: text("error_message"), // If status is "failed"
		requestPayload: json("request_payload").$type<Record<string, unknown>>(), // Original webhook payload
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("shopify_compliance_shop_idx").on(table.shopId),
		index("shopify_compliance_action_idx").on(table.action),
		index("shopify_compliance_status_idx").on(table.status),
	],
);

export type ShopifyComplianceAuditLog = typeof shopifyComplianceAuditLog.$inferSelect;
export type NewShopifyComplianceAuditLog = typeof shopifyComplianceAuditLog.$inferInsert;

// Shopify Customers - synced customer data for context enrichment
export const shopifyCustomers = pgTable(
	"shopify_customers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shopifyShops.id, { onDelete: "cascade" }),
		shopifyCustomerId: text("shopify_customer_id").notNull(), // Shopify's customer ID
		email: text("email"),
		firstName: text("first_name"),
		lastName: text("last_name"),
		phone: text("phone"),
		ordersCount: integer("orders_count").default(0),
		totalSpent: text("total_spent"), // Stored as string for precision
		currency: text("currency"),
		tags: json("tags").$type<string[]>().default([]),
		note: text("note"),
		acceptsMarketing: boolean("accepts_marketing").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		shopifyCreatedAt: timestamp("shopify_created_at"),
	},
	(table) => [
		index("shopify_customers_shop_idx").on(table.shopId),
		index("shopify_customers_email_idx").on(table.shopId, table.email),
		uniqueIndex("shopify_customers_shopify_id_idx").on(table.shopId, table.shopifyCustomerId),
	],
);

export type ShopifyCustomer = typeof shopifyCustomers.$inferSelect;
export type NewShopifyCustomer = typeof shopifyCustomers.$inferInsert;

// Shopify Orders - synced order data for context enrichment
export const shopifyOrders = pgTable(
	"shopify_orders",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shopifyShops.id, { onDelete: "cascade" }),
		shopifyOrderId: text("shopify_order_id").notNull(), // Shopify's order ID
		orderNumber: text("order_number").notNull(), // Display order number (e.g., "#1001")
		customerEmail: text("customer_email"),
		customerId: uuid("customer_id").references(() => shopifyCustomers.id, { onDelete: "set null" }),
		financialStatus: text("financial_status"), // "pending" | "paid" | "refunded" | "partially_refunded" etc.
		fulfillmentStatus: text("fulfillment_status"), // null | "fulfilled" | "partial" | "unfulfilled"
		totalPrice: text("total_price").notNull(), // Stored as string for precision
		subtotalPrice: text("subtotal_price"),
		totalTax: text("total_tax"),
		totalShipping: text("total_shipping"),
		currency: text("currency").default("USD"),
		lineItems:
			json("line_items").$type<
				Array<{
					id: string;
					title: string;
					quantity: number;
					price: string;
					sku?: string;
					variantTitle?: string;
				}>
			>(),
		shippingAddress: json("shipping_address").$type<{
			name?: string;
			address1?: string;
			address2?: string;
			city?: string;
			province?: string;
			country?: string;
			zip?: string;
			phone?: string;
		}>(),
		trackingNumber: text("tracking_number"),
		trackingUrl: text("tracking_url"),
		trackingCompany: text("tracking_company"),
		cancelledAt: timestamp("cancelled_at"),
		closedAt: timestamp("closed_at"),
		shopifyCreatedAt: timestamp("shopify_created_at").notNull(),
		shopifyUpdatedAt: timestamp("shopify_updated_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("shopify_orders_shop_idx").on(table.shopId),
		index("shopify_orders_email_idx").on(table.shopId, table.customerEmail),
		index("shopify_orders_number_idx").on(table.shopId, table.orderNumber),
		uniqueIndex("shopify_orders_shopify_id_idx").on(table.shopId, table.shopifyOrderId),
	],
);

export type ShopifyOrder = typeof shopifyOrders.$inferSelect;
export type NewShopifyOrder = typeof shopifyOrders.$inferInsert;

// Shopify Products - synced product data for context enrichment
export const shopifyProducts = pgTable(
	"shopify_products",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shopifyShops.id, { onDelete: "cascade" }),
		shopifyProductId: text("shopify_product_id").notNull(), // Shopify's product ID
		title: text("title").notNull(),
		handle: text("handle"), // URL-friendly slug
		description: text("description"), // HTML description
		vendor: text("vendor"),
		productType: text("product_type"),
		status: text("status").default("active"), // "active" | "draft" | "archived"
		tags: json("tags").$type<string[]>().default([]),
		variants:
			json("variants").$type<
				Array<{
					id: string;
					title: string;
					price: string;
					compareAtPrice?: string;
					sku?: string;
					inventoryQuantity: number;
					option1?: string;
					option2?: string;
					option3?: string;
				}>
			>(),
		images:
			json("images").$type<
				Array<{
					id: string;
					src: string;
					alt?: string;
					position: number;
				}>
			>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		shopifyCreatedAt: timestamp("shopify_created_at"),
		shopifyUpdatedAt: timestamp("shopify_updated_at"),
		publishedAt: timestamp("published_at"), // null = not published to online store
	},
	(table) => [
		index("shopify_products_shop_idx").on(table.shopId),
		index("shopify_products_handle_idx").on(table.shopId, table.handle),
		uniqueIndex("shopify_products_shopify_id_idx").on(table.shopId, table.shopifyProductId),
		// B-tree indexes for product search
		index("shopify_products_product_type_idx").on(table.productType),
	],
);

export type ShopifyProduct = typeof shopifyProducts.$inferSelect;
export type NewShopifyProduct = typeof shopifyProducts.$inferInsert;

// Shopify Refund Requests - pending refunds that need approval
export const shopifyRefundRequests = pgTable(
	"shopify_refund_requests",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		shopId: uuid("shop_id")
			.notNull()
			.references(() => shopifyShops.id, { onDelete: "cascade" }),
		orderId: uuid("order_id")
			.notNull()
			.references(() => shopifyOrders.id, { onDelete: "cascade" }),
		conversationId: uuid("conversation_id").references(() => conversations.id, {
			onDelete: "set null",
		}),
		amount: integer("amount").notNull(), // Amount in cents
		currency: text("currency").notNull().default("USD"),
		reason: text("reason"), // Reason provided by customer/AI
		lineItems:
			json("line_items").$type<
				Array<{
					lineItemId: string;
					quantity: number;
				}>
			>(),
		status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "processed"
		reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
		reviewedAt: timestamp("reviewed_at"),
		reviewNotes: text("review_notes"),
		shopifyRefundId: text("shopify_refund_id"), // Set after refund is processed
		// Customer contact info for escalation follow-up
		customerName: text("customer_name"),
		customerEmail: text("customer_email"),
		customerPhone: text("customer_phone"),
		// Flag for potential fraud detection - submitted email doesn't match order email
		emailMismatch: boolean("email_mismatch").default(false).notNull(),
		// Error tracking for failed refunds
		errorMessage: text("error_message"),
		// Retry rate limiting (max 3 retries, 1-min cooldown)
		retryCount: integer("retry_count").default(0).notNull(),
		lastRetryAt: timestamp("last_retry_at"),
		// Notification tracking
		slackNotified: boolean("slack_notified").default(false).notNull(),
		emailNotified: boolean("email_notified").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("shopify_refund_requests_shop_idx").on(table.shopId),
		index("shopify_refund_requests_status_idx").on(table.shopId, table.status),
	],
);

export type ShopifyRefundRequest = typeof shopifyRefundRequests.$inferSelect;
export type NewShopifyRefundRequest = typeof shopifyRefundRequests.$inferInsert;

// Email Channel Settings - per-agent email configuration
export const emailChannelSettings = pgTable("email_channel_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// Inbound address (auto-generated, unique per agent)
	inboundAddress: text("inbound_address").notNull().unique(), // e.g., agent-abc123@mail.ansa.so
	// Reply configuration
	replyAddress: text("reply_address"), // Verified email for sending replies
	displayName: text("display_name").notNull().default("AI Assistant"), // From name
	// Notifications
	alertContact: text("alert_contact"), // Email for delivery/bounce alerts
	// Response formatting
	disclaimerEnabled: boolean("disclaimer_enabled").notNull().default(true),
	disclaimerText: text("disclaimer_text").default("This response was composed by an AI assistant."),
	signature: text("signature"), // HTML signature appended to replies
	subjectPrefix: text("subject_prefix"), // Optional prefix for reply subjects
	includeOriginal: boolean("include_original").notNull().default(true), // Quote original email
	ccAddress: text("cc_address"), // Optionally CC a team inbox
	// Access control
	allowedDomains: json("allowed_domains").$type<string[]>().default([]), // Whitelist domains
	blockedSenders: json("blocked_senders").$type<string[]>().default([]), // Blacklist addresses
	// Auto-learn from human responses
	autoLearnEnabled: boolean("auto_learn_enabled").notNull().default(false), // Auto-add human responses to QA
	// AI Confidence settings
	confidenceThreshold: integer("confidence_threshold").default(70), // Threshold for low confidence
	lowConfidenceAction: text("low_confidence_action").default("escalate"), // escalate, nothing, do_nothing, forward
	forwardToEmail: text("forward_to_email"), // Email to forward low confidence emails to
	// Thread creation mode: always (new conversation each email), subject (group by sender+subject), sender (group by sender)
	threadCreationMode: text("thread_creation_mode").notNull().default("always"),
	// Status
	enabled: boolean("enabled").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailChannelSettings = typeof emailChannelSettings.$inferSelect;
export type NewEmailChannelSettings = typeof emailChannelSettings.$inferInsert;

// Email Threads - map sender email + agent to conversation for thread matching
export const emailThreads = pgTable(
	"email_threads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		senderEmail: text("sender_email").notNull(), // Customer's email address
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		lastMessageId: text("last_message_id"), // For In-Reply-To header
		subject: text("subject"), // Original email subject
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Index for finding existing thread by agent + sender (non-unique to support multiple threads per sender)
		index("email_threads_agent_sender_idx").on(table.agentId, table.senderEmail),
		// Index for finding thread by agent + sender + subject (for subject-based threading)
		index("email_threads_agent_sender_subject_idx").on(
			table.agentId,
			table.senderEmail,
			table.subject,
		),
		index("email_threads_conversation_idx").on(table.conversationId),
	],
);

export type EmailThread = typeof emailThreads.$inferSelect;
export type NewEmailThread = typeof emailThreads.$inferInsert;

// ============ Triggers ============

// Triggers table - automate chat interactions based on user behavior
export const triggers = pgTable(
	"triggers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		// Trigger type: when should this fire?
		triggerType: text("trigger_type").notNull(), // "time_on_page" | "scroll_depth" | "exit_intent" | "page_view" | "custom_event"
		// Conditions for the trigger
		conditions: json("conditions")
			.$type<{
				timeOnPage?: number; // seconds
				scrollDepth?: number; // percentage 0-100
				page?: string; // URL pattern (supports * wildcard)
				event?: string; // custom event name
				eventData?: Record<string, unknown>; // custom event data conditions
			}>()
			.notNull(),
		// Action type: what should happen?
		actionType: text("action_type").notNull(), // "open_chat" | "show_form" | "show_bubble"
		// Action configuration
		actionConfig: json("action_config")
			.$type<{
				message?: string; // Message to send (for open_chat, show_form, show_bubble)
				toolId?: string; // Form tool to show (for show_form)
				duration?: number; // Auto-hide duration in ms (for show_bubble)
			}>()
			.notNull(),
		// Trigger behavior
		triggerOnce: boolean("trigger_once").default(true), // Only trigger once per session
		isEnabled: boolean("is_enabled").default(true).notNull(),
		priority: integer("priority").default(0), // Higher priority triggers first
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("triggers_agent_idx").on(table.agentId),
		index("triggers_enabled_idx").on(table.agentId, table.isEnabled),
	],
);

export type Trigger = typeof triggers.$inferSelect;
export type NewTrigger = typeof triggers.$inferInsert;

// Trigger Events - raw event tracking for trigger activations
export const triggerEvents = pgTable(
	"trigger_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		triggerId: uuid("trigger_id").references(() => triggers.id, { onDelete: "set null" }), // null if trigger deleted
		triggerName: text("trigger_name").notNull(), // denormalized for analytics after deletion
		triggerType: text("trigger_type").notNull(), // "time_on_page" | "scroll_depth" | etc.
		actionType: text("action_type").notNull(), // "open_chat" | "show_form" | "show_bubble"
		eventType: text("event_type").notNull(), // "fired" | "converted" (user sent message)
		sessionId: text("session_id"), // track unique sessions
		pagePath: text("page_path"), // page where trigger fired
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("trigger_events_agent_idx").on(table.agentId),
		index("trigger_events_trigger_idx").on(table.triggerId),
		index("trigger_events_created_idx").on(table.createdAt),
	],
);

export type TriggerEvent = typeof triggerEvents.$inferSelect;
export type NewTriggerEvent = typeof triggerEvents.$inferInsert;

// Analytics trigger daily rollups
export const analyticsTriggerDaily = pgTable(
	"analytics_trigger_daily",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(), // midnight UTC
		triggerId: uuid("trigger_id").references(() => triggers.id, { onDelete: "set null" }),
		triggerName: text("trigger_name").notNull(), // denormalized for display after deletion
		triggerType: text("trigger_type").notNull(),
		firedCount: integer("fired_count").notNull().default(0),
		convertedCount: integer("converted_count").notNull().default(0), // user sent message
		uniqueSessions: integer("unique_sessions").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("analytics_trigger_daily_idx").on(table.agentId, table.date, table.triggerId)],
);

export type AnalyticsTriggerDaily = typeof analyticsTriggerDaily.$inferSelect;
export type NewAnalyticsTriggerDaily = typeof analyticsTriggerDaily.$inferInsert;

// Trigger templates for marketplace
export const triggerTemplates = pgTable("trigger_templates", {
	id: uuid("id").primaryKey().defaultRandom(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	longDescription: text("long_description"),
	category: text("category").notNull(), // "engagement" | "conversion" | "ecommerce" | "lead-generation" | "support" | "feedback"
	icon: text("icon").default("zap"),
	triggerType: text("trigger_type").notNull(),
	conditions: json("conditions")
		.$type<{
			timeOnPage?: number;
			scrollDepth?: number;
			page?: string;
			event?: string;
			eventData?: Record<string, unknown>;
		}>()
		.notNull(),
	actionType: text("action_type").notNull(),
	actionConfig: json("action_config")
		.$type<{
			message?: string;
			toolId?: string;
			duration?: number;
		}>()
		.notNull(),
	// Reference to a form template if this trigger should show a form
	formTemplateSlug: text("form_template_slug"),
	triggerOnce: boolean("trigger_once").default(true),
	isFree: boolean("is_free").default(true),
	installCount: integer("install_count").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TriggerTemplate = typeof triggerTemplates.$inferSelect;
export type NewTriggerTemplate = typeof triggerTemplates.$inferInsert;

// API Keys for SDK/REST API authentication
export const apiKeys = pgTable(
	"api_keys",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(), // User-friendly name like "Production", "Development"
		keyPrefix: text("key_prefix").notNull(), // First 8 chars for display: "ansa_sk_abc12345..."
		keyHash: text("key_hash").notNull(), // SHA-256 hash of full key
		lastUsedAt: timestamp("last_used_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("api_keys_user_idx").on(table.userId)],
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// ============ ESCALATIONS ============

// Escalation Settings - per-agent configuration for human escalation
export const agentEscalationSettings = pgTable("agent_escalation_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// Feature toggle
	enabled: boolean("enabled").notNull().default(false),
	// When to show escalation buttons
	showButtonsAfter: text("show_buttons_after").notNull().default("on_human_request"), // "every_response" | "thumbs_down_only" | "after_n_messages" | "on_human_request" | "on_low_confidence" | "on_help_request" | "on_human_or_negative_feedback" | "on_any_signal"
	showAfterMessageCount: integer("show_after_message_count").default(3), // Used when showButtonsAfter is "after_n_messages"
	// Auto-escalation on low confidence (unified with email channel)
	autoEscalateOnLowConfidence: boolean("auto_escalate_on_low_confidence").notNull().default(false),
	confidenceThreshold: integer("confidence_threshold").default(50), // 0-100, below this auto-escalates
	// Notification configuration
	notificationMethod: text("notification_method").notNull().default("email"), // "slack" | "email" | "webhook" | "all"
	notificationConfig: json("notification_config").$type<{
		webhookUrl?: string;
		webhookHeaders?: Record<string, string>;
		slackWebhookUrl?: string;
		emailRecipientIds?: string[]; // User IDs to notify
	}>(),
	// Default assignment
	defaultPriority: text("default_priority").notNull().default("medium"), // "low" | "medium" | "high" | "urgent"
	defaultAssigneeId: text("default_assignee_id").references(() => users.id, {
		onDelete: "set null",
	}),
	// SLA configuration (in minutes until first response)
	slaConfig: json("sla_config").$type<{
		low?: number;
		medium?: number;
		high?: number;
		urgent?: number;
	}>(),
	// Auto-close settings (in minutes of inactivity)
	widgetAutoCloseMinutes: integer("widget_auto_close_minutes").default(60), // 1 hour for widget/iframe
	emailAutoCloseMinutes: integer("email_auto_close_minutes").default(2880), // 48 hours for email
	// Widget AI confidence settings
	widgetConfidenceThreshold: integer("widget_confidence_threshold").default(50), // 0-100
	widgetLowConfidenceAction: text("widget_low_confidence_action").default("respond"), // respond | escalate | do_nothing
	// Timestamps
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AgentEscalationSettings = typeof agentEscalationSettings.$inferSelect;
export type NewAgentEscalationSettings = typeof agentEscalationSettings.$inferInsert;

// Escalations - unified tracking for human escalation requests across all channels
export const escalations = pgTable(
	"escalations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		// Status tracking
		status: text("status").notNull().default("open"), // "open" | "assigned" | "in_progress" | "waiting_on_customer" | "resolved"
		priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high" | "urgent"
		// Source of escalation
		escalationSource: text("escalation_source").notNull(), // "user_request" | "low_confidence" | "form"
		// Assignment
		assignedToId: text("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
		assignedAt: timestamp("assigned_at"),
		assignedById: text("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
		// SLA tracking
		slaDeadline: timestamp("sla_deadline"),
		slaBrokenAt: timestamp("sla_broken_at"), // Set when SLA is breached
		// Response tracking
		firstResponseAt: timestamp("first_response_at"), // When first human response was sent
		resolvedAt: timestamp("resolved_at"),
		resolvedById: text("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
		// User attribution tracking
		escalatedBy: text("escalated_by").references(() => users.id, { onDelete: "set null" }), // Who escalated (null for widget/auto)
		resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }), // Who de-escalated
		resolutionNote: text("resolution_note"), // Optional note when de-escalating
		// Notification tracking
		notificationSentAt: timestamp("notification_sent_at"),
		// Timestamps
		escalatedAt: timestamp("escalated_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("escalations_agent_idx").on(table.agentId),
		index("escalations_conversation_idx").on(table.conversationId),
		index("escalations_status_idx").on(table.status),
		index("escalations_assignee_idx").on(table.assignedToId),
		index("escalations_sla_idx").on(table.slaDeadline, table.slaBrokenAt),
	],
);

export type Escalation = typeof escalations.$inferSelect;
export type NewEscalation = typeof escalations.$inferInsert;

// Turns - represents a user intent and the AI's complete response (including tools/forms)
export const turns = pgTable(
	"turns",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		userMessageId: uuid("user_message_id")
			.notNull()
			.references(() => chatMessages.id, { onDelete: "cascade" }),
		status: text("status").notNull().default("in_progress"), // "in_progress" | "completed" | "timed_out"
		hasKbContext: boolean("has_kb_context").default(false), // true if AI attempted KB answer
		escalationIntent: text("escalation_intent"), // "human_request" | "help_request" | "low_confidence" | null
		startedAt: timestamp("started_at").defaultNow().notNull(),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("turns_conversation_idx").on(table.conversationId),
		index("turns_agent_idx").on(table.agentId),
		index("turns_status_idx").on(table.status),
		index("turns_started_at_idx").on(table.startedAt),
	],
);

export type Turn = typeof turns.$inferSelect;
export type NewTurn = typeof turns.$inferInsert;

// Turn Events - tracks all events within a turn (assistant messages, tool calls, conversions)
export const turnEvents = pgTable(
	"turn_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		turnId: uuid("turn_id")
			.notNull()
			.references(() => turns.id, { onDelete: "cascade" }),
		eventType: text("event_type").notNull(), // "assistant_message" | "tool_call" | "form_submit" | "cta_click"
		eventId: uuid("event_id").notNull(), // ID of the related entity (message, tool execution, form submission)
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("turn_events_turn_idx").on(table.turnId),
		index("turn_events_type_idx").on(table.eventType),
		index("turn_events_created_at_idx").on(table.createdAt),
		index("turn_events_turn_type_idx").on(table.turnId, table.eventType), // Composite for conversions analytics
	],
);

export type TurnEvent = typeof turnEvents.$inferSelect;
export type NewTurnEvent = typeof turnEvents.$inferInsert;

// Retrieval Traces - stores KB retrieval metadata for each assistant response
export const retrievalTraces = pgTable(
	"retrieval_traces",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		turnId: uuid("turn_id")
			.notNull()
			.references(() => turns.id, { onDelete: "cascade" }),
		assistantMessageId: uuid("assistant_message_id")
			.notNull()
			.references(() => chatMessages.id, { onDelete: "cascade" }),
		confidenceScore: integer("confidence_score"), // 0-100, copied from message for analytics
		retrievalMode: text("retrieval_mode").notNull(), // "kb" | "hybrid" | "none"
		topK: integer("top_k").notNull(), // Number of chunks retrieved
		sourcesUsedCount: integer("sources_used_count").notNull(), // Unique sources in results
		noContextReason: text("no_context_reason"), // "no_results" | "filtered" | "timeout" | "disabled"
		retrievedChunks:
			json("retrieved_chunks").$type<
				Array<{
					sourceId: string;
					chunkId: string;
					score: number;
					sourceType: string;
					title?: string;
				}>
			>(), // Forensic snapshot of retrieval results
		retrievalLatencyMs: integer("retrieval_latency_ms"), // End-to-end vector search time
		candidateCount: integer("candidate_count"), // Raw results before filtering
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("retrieval_traces_turn_idx").on(table.turnId),
		index("retrieval_traces_message_idx").on(table.assistantMessageId),
		index("retrieval_traces_created_at_idx").on(table.createdAt),
		index("retrieval_traces_turn_confidence_idx").on(table.turnId, table.confidenceScore), // Composite for conversions analytics
	],
);

export type RetrievalTrace = typeof retrievalTraces.$inferSelect;
export type NewRetrievalTrace = typeof retrievalTraces.$inferInsert;

// KB Retrieval Sources - junction table for analytics on which KB sources drive conversions
export const kbRetrievalSources = pgTable(
	"kb_retrieval_sources",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		traceId: uuid("trace_id")
			.notNull()
			.references(() => retrievalTraces.id, { onDelete: "cascade" }),
		sourceId: text("source_id").notNull(), // Document/text/qa/web source ID
		chunkId: text("chunk_id").notNull(), // Specific chunk ID
		score: integer("score").notNull(), // Similarity score * 100 (0-100)
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("kb_retrieval_sources_trace_idx").on(table.traceId),
		index("kb_retrieval_sources_source_date_idx").on(table.sourceId, table.createdAt), // For article-level aggregation
		index("kb_retrieval_sources_chunk_idx").on(table.chunkId), // For future chunk-level analysis
	],
);

export type KbRetrievalSource = typeof kbRetrievalSources.$inferSelect;
export type NewKbRetrievalSource = typeof kbRetrievalSources.$inferInsert;

// Question Clusters - cached semantic clustering results for Conversions page
export const questionClusters = pgTable(
	"question_clusters",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		clusterDate: timestamp("cluster_date").notNull(), // Date when clustering was run
		windowDays: integer("window_days").notNull().default(90), // Rolling window size
		representativeQuestionId: uuid("representative_question_id")
			.notNull()
			.references(() => chatMessages.id, { onDelete: "cascade" }), // Question closest to centroid
		memberQuestionIds: json("member_question_ids").$type<string[]>().notNull(), // All question IDs in cluster
		conversationCount: integer("conversation_count").notNull(), // Number of conversations
		conversionCount: integer("conversion_count").notNull(), // Number with conversions
		conversionRate: integer("conversion_rate").notNull(), // Percentage * 100 (0-10000)
		avgConfidenceScore: integer("avg_confidence_score"), // Average confidence (0-100)
		mostRecentQuestionId: uuid("most_recent_question_id").references(() => chatMessages.id, {
			onDelete: "set null",
		}),
		highestConvertingQuestionId: uuid("highest_converting_question_id").references(
			() => chatMessages.id,
			{
				onDelete: "set null",
			},
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("question_clusters_agent_idx").on(table.agentId),
		index("question_clusters_date_idx").on(table.clusterDate),
		index("question_clusters_agent_date_idx").on(table.agentId, table.clusterDate),
	],
);

export type QuestionCluster = typeof questionClusters.$inferSelect;
export type NewQuestionCluster = typeof questionClusters.$inferInsert;

// Actions table removed - action configuration now lives directly on agentTools
// See: allowAiSuggest, countsAsConversion, countsAsResolution, category fields

// ============ Facebook Messenger Channel ============

// Messenger Channel Settings - per-agent Messenger configuration
export const messengerChannelSettings = pgTable("messenger_channel_settings", {
	id: uuid("id").primaryKey().defaultRandom(),
	agentId: uuid("agent_id")
		.notNull()
		.unique()
		.references(() => agents.id, { onDelete: "cascade" }),
	// AI Confidence settings
	confidenceThreshold: integer("confidence_threshold").default(70), // Threshold for low confidence
	lowConfidenceAction: text("low_confidence_action").default("escalate"), // escalate, nothing, do_nothing, forward
	forwardToEmail: text("forward_to_email"), // Email to forward low confidence messages to
	// Status
	enabled: boolean("enabled").notNull().default(true),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MessengerChannelSettings = typeof messengerChannelSettings.$inferSelect;
export type NewMessengerChannelSettings = typeof messengerChannelSettings.$inferInsert;

// Messenger Pages - connected Facebook Pages (multiple per agent)
export const messengerPages = pgTable(
	"messenger_pages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		// Facebook Page info
		facebookPageId: text("facebook_page_id").notNull().unique(), // Facebook's Page ID
		pageName: text("page_name").notNull(), // Display name of the page
		pageAccessToken: text("page_access_token").notNull(), // Long-lived page access token
		// Webhook verification
		webhookVerifyToken: text("webhook_verify_token").notNull(), // Random token for webhook verification
		// Status
		enabled: boolean("enabled").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("messenger_pages_agent_idx").on(table.agentId),
		index("messenger_pages_facebook_page_idx").on(table.facebookPageId),
	],
);

export type MessengerPage = typeof messengerPages.$inferSelect;
export type NewMessengerPage = typeof messengerPages.$inferInsert;

// Messenger Threads - map sender PSID + page to conversation for thread matching
export const messengerThreads = pgTable(
	"messenger_threads",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		messengerPageId: uuid("messenger_page_id")
			.notNull()
			.references(() => messengerPages.id, { onDelete: "cascade" }),
		senderPsid: text("sender_psid").notNull(), // Page-scoped user ID from Facebook
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique constraint: one conversation per sender per page
		uniqueIndex("messenger_threads_page_sender_idx").on(table.messengerPageId, table.senderPsid),
		index("messenger_threads_conversation_idx").on(table.conversationId),
	],
);

export type MessengerThread = typeof messengerThreads.$inferSelect;
export type NewMessengerThread = typeof messengerThreads.$inferInsert;

// Paperclip: File attachments for chat messages
export const attachments = pgTable(
	"attachments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => chatMessages.id, { onDelete: "cascade" }),
		filename: text("filename").notNull(),
		contentType: text("content_type").notNull(),
		fileSize: integer("file_size").notNull(),
		filePath: text("file_path").notNull(), // Relative path to the uploaded file
		uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("attachments_message_idx").on(table.messageId),
		index("attachments_uploaded_by_idx").on(table.uploadedBy),
	],
);

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
