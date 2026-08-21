import posthog from "posthog-js";

// ===================
// Event Types
// ===================

// Core activation events
type ActivationEvent =
	| "user_signed_up"
	| "onboarding_started"
	| "onboarding_completed"
	| "agent_created"
	| "widget_code_copied"
	| "first_conversation";

// Knowledge base events
type KnowledgeEvent =
	| "knowledge_added"
	| "knowledge_qa_added"
	| "knowledge_file_uploaded"
	| "knowledge_text_added"
	| "knowledge_website_crawled";

// Tool & automation events
type ToolEvent =
	| "tool_created"
	| "tool_updated"
	| "marketplace_tool_installed"
	| "trigger_created"
	| "trigger_updated";

// Engagement events
type EngagementEvent =
	| "chat_tested"
	| "conversation_viewed"
	| "conversation_replied"
	| "conversation_resolved"
	| "analytics_viewed";

// Settings events
type SettingsEvent =
	| "agent_settings_updated"
	| "widget_customized"
	| "translation_added"
	| "security_settings_updated";

// Team & billing events
type TeamBillingEvent =
	| "team_member_invited"
	| "plan_selected"
	| "plan_upgraded"
	| "plan_downgraded"
	| "billing_portal_opened";

// Integration events
type IntegrationEvent =
	| "shopify_connected"
	| "shopify_agent_linked"
	| "api_key_created"
	| "email_channel_configured";

export type AnalyticsEvent =
	| ActivationEvent
	| KnowledgeEvent
	| ToolEvent
	| EngagementEvent
	| SettingsEvent
	| TeamBillingEvent
	| IntegrationEvent;

// ===================
// Event Properties
// ===================

export interface EventProperties {
	// Common
	agentId?: string;
	agentName?: string;

	// Knowledge
	type?: "qa" | "file" | "text" | "web";
	fileType?: string;
	sizeBytes?: number;
	questionCount?: number;
	sourceType?: "individual" | "sitemap" | "crawl";
	pagesCount?: number;

	// Tools
	executionType?: "form" | "webhook" | "api";
	toolName?: string;
	toolSlug?: string;
	triggerType?: string;
	actionType?: string;
	hasWebhook?: boolean;

	// Engagement
	conversationId?: string;
	isEscalated?: boolean;
	responseTimeMs?: number;
	resolutionType?: string;
	dateRange?: string;

	// Settings
	settingChanged?: string;
	changes?: string[];
	languageCode?: string;
	settingType?: string;

	// Team & billing
	role?: string;
	fromPlan?: string;
	toPlan?: string;
	planName?: string;
	billingPeriod?: "monthly" | "yearly";

	// Integrations
	shopDomain?: string;
	shopId?: string;
	keyName?: string;

	// Onboarding
	websiteUrl?: string;
	viaOnboarding?: boolean;
	signupMethod?: "email" | "google" | "github";

	// Generic
	[key: string]: unknown;
}

// ===================
// Analytics Functions
// ===================

/**
 * Track a client-side analytics event
 */
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
	if (typeof window === "undefined") return;

	try {
		posthog.capture(event, properties);
	} catch (error) {
		console.error("[Analytics] Failed to track event:", event, error);
	}
}

/**
 * Identify a user after authentication
 */
export function identifyUser(
	userId: string,
	properties: {
		email?: string;
		name?: string;
		plan?: string;
		createdAt?: string | Date;
		accountId?: string;
	},
): void {
	if (typeof window === "undefined") return;

	try {
		posthog.identify(userId, {
			email: properties.email,
			name: properties.name,
			plan: properties.plan,
			created_at: properties.createdAt,
			account_id: properties.accountId,
		});
	} catch (error) {
		console.error("[Analytics] Failed to identify user:", error);
	}
}

/**
 * Reset user identity on logout
 */
export function resetUser(): void {
	if (typeof window === "undefined") return;

	try {
		posthog.reset();
	} catch (error) {
		console.error("[Analytics] Failed to reset user:", error);
	}
}

/**
 * Set properties on the current user (without identifying)
 */
export function setUserProperties(properties: Record<string, unknown>): void {
	if (typeof window === "undefined") return;

	try {
		posthog.people.set(properties);
	} catch (error) {
		console.error("[Analytics] Failed to set user properties:", error);
	}
}

/**
 * Track when a user starts a new session with an agent
 * Useful for tracking which agents get the most engagement
 */
export function trackAgentSession(agentId: string, agentName?: string): void {
	trackEvent("chat_tested", { agentId, agentName });
}

/**
 * Register super properties (included with all future events)
 */
export function registerSuperProperties(properties: Record<string, unknown>): void {
	if (typeof window === "undefined") return;

	try {
		posthog.register(properties);
	} catch (error) {
		console.error("[Analytics] Failed to register super properties:", error);
	}
}
