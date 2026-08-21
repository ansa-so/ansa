import { PostHog } from "posthog-node";

// ===================
// Configuration
// ===================

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

// Create PostHog client (lazy initialization)
let posthogClient: PostHog | null = null;

function getClient(): PostHog | null {
	if (!POSTHOG_API_KEY) {
		return null;
	}

	if (!posthogClient) {
		posthogClient = new PostHog(POSTHOG_API_KEY, {
			host: POSTHOG_HOST,
			flushAt: 20, // Flush after 20 events
			flushInterval: 10000, // Or every 10 seconds
		});
	}

	return posthogClient;
}

// ===================
// Event Types
// ===================

type ServerEvent =
	// Conversation events
	| "conversation_started"
	| "conversation_message_received"
	| "conversation_escalated"
	| "conversation_resolved"
	// Form/tool events
	| "form_submission_received"
	| "tool_executed"
	// Billing events
	| "plan_upgraded"
	| "plan_downgraded"
	| "subscription_created"
	| "subscription_cancelled"
	// Team events
	| "team_member_joined"
	| "team_member_removed"
	// Agent events
	| "agent_created"
	| "agent_deleted"
	// Knowledge events
	| "knowledge_source_added"
	| "knowledge_source_removed"
	// Attachment (Paperclip) events
	| "attachment_uploaded"
	| "attachment_upload_failed"
	| "attachment_downloaded"
	| "attachment_download_failed"
	| "attachment_viewed"
	| "attachment_deleted";

interface ServerEventProperties {
	// Common
	agentId?: string;
	accountId?: string;
	environment?: string;

	// Conversation
	conversationId?: string;
	messageCount?: number;
	isEscalated?: boolean;
	escalationReason?: string;
	resolutionType?: string;

	// Form/tool
	toolId?: string;
	toolName?: string;
	isConversion?: boolean;
	formFields?: number;

	// Billing
	fromPlan?: string;
	toPlan?: string;
	planName?: string;
	billingPeriod?: "monthly" | "yearly";
	mrr?: number;

	// Team
	role?: string;
	inviterId?: string;

	// Knowledge
	sourceType?: "qa" | "file" | "text" | "web";
	sizeBytes?: number;

	// Generic
	[key: string]: unknown;
}

// ===================
// Analytics Functions
// ===================

/**
 * Track a server-side event
 */
export function trackServerEvent(
	event: ServerEvent,
	userId: string,
	properties?: ServerEventProperties,
): void {
	const client = getClient();
	if (!client) return;

	try {
		client.capture({
			distinctId: userId,
			event,
			properties: {
				...properties,
				environment: process.env.NODE_ENV,
				app: "api",
			},
		});
	} catch (error) {
		console.error("[Analytics] Failed to track server event:", event, error);
	}
}

/**
 * Track a server-side event with account-level attribution
 * Use when user ID isn't available but account ID is
 */
export function trackAccountEvent(
	event: ServerEvent,
	accountId: string,
	properties?: ServerEventProperties,
): void {
	const client = getClient();
	if (!client) return;

	try {
		// Use account: prefix to distinguish from user IDs
		client.capture({
			distinctId: `account:${accountId}`,
			event,
			properties: {
				...properties,
				accountId,
				environment: process.env.NODE_ENV,
				app: "api",
			},
		});
	} catch (error) {
		console.error("[Analytics] Failed to track account event:", event, error);
	}
}

/**
 * Identify a user with properties (server-side)
 */
export function identifyServerUser(
	userId: string,
	properties: {
		email?: string;
		name?: string;
		plan?: string;
		accountId?: string;
		createdAt?: string | Date;
	},
): void {
	const client = getClient();
	if (!client) return;

	try {
		client.identify({
			distinctId: userId,
			properties: {
				email: properties.email,
				name: properties.name,
				plan: properties.plan,
				account_id: properties.accountId,
				created_at: properties.createdAt,
			},
		});
	} catch (error) {
		console.error("[Analytics] Failed to identify user:", error);
	}
}

/**
 * Flush pending events (call on graceful shutdown)
 */
export async function flushAnalytics(): Promise<void> {
	const client = getClient();
	if (!client) return;

	try {
		await client.shutdown();
	} catch (error) {
		console.error("[Analytics] Failed to flush events:", error);
	}
}

/**
 * Check if PostHog is configured
 */
export function isAnalyticsEnabled(): boolean {
	return !!POSTHOG_API_KEY;
}

// ===================
// LLM Cost Tracking
// ===================

interface LLMCostProperties {
	agentId: string;
	conversationId: string;
	messageId: string;
	model: string;
	provider: "anthropic" | "openai" | "gemini" | "ollama";
	tier: string;
	inputTokens: number;
	outputTokens: number;
	costCents: number;
	costInputCents: number;
	costOutputCents: number;
	channel: string;
	isToolFollowup: boolean;
	latencyMs?: number;
	traceId?: string;
	outputChoices?: unknown;
}

/**
 * Track LLM usage and costs
 */
export function trackLLMCost(userId: string, properties: LLMCostProperties): void {
	const client = getClient();
	if (!client) return;

	try {
		// Emit PostHog LLM Analytics event ($ai_generation)
		client.capture({
			distinctId: userId,
			event: "$ai_generation",
			properties: {
				// Required schema fields
				model: properties.model,
				provider: properties.provider,
				input: properties.inputTokens,
				output: properties.outputTokens,
				input_tokens: properties.inputTokens,
				output_tokens: properties.outputTokens,
				total_tokens: properties.inputTokens + properties.outputTokens,
				cost: properties.costCents / 100,
				cost_input: properties.costInputCents / 100,
				cost_output: properties.costOutputCents / 100,
				latency: properties.latencyMs ?? null,
				trace_id: properties.traceId ?? null,
				output_choices: properties.outputChoices ?? null,
				// Contextual fields
				agent_id: properties.agentId,
				conversation_id: properties.conversationId,
				message_id: properties.messageId,
				tier: properties.tier,
				channel: properties.channel,
				is_tool_followup: properties.isToolFollowup,
				environment: process.env.NODE_ENV,
				app: "api",
			},
		});
	} catch (error) {
		console.error("[Analytics] Failed to track LLM cost:", error);
	}
}
