export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	total: number;
	page: number;
	limit: number;
}

// AI Quality Tiers
export const AI_QUALITY_TIERS = {
	FAST: "fast",
	BALANCED: "balanced",
	HIGH_QUALITY: "high_quality",
} as const;

export type AIQuality = (typeof AI_QUALITY_TIERS)[keyof typeof AI_QUALITY_TIERS];

// Default tier for new agents
export const DEFAULT_AI_QUALITY: AIQuality = AI_QUALITY_TIERS.BALANCED;

// User-facing tier options (FAST is internal only)
export const USER_VISIBLE_TIERS = [
	AI_QUALITY_TIERS.BALANCED,
	AI_QUALITY_TIERS.HIGH_QUALITY,
] as const;

export interface UserDto {
	id: string;
	email: string;
	name: string | null;
	createdAt: Date;
}

// ChatKit protocol types
export type MessageRole = "user" | "assistant";

export interface ChatMessage {
	role: MessageRole;
	content: string;
}

export interface ChatRequest {
	messages: ChatMessage[];
	threadId?: string;
}

// SSE event types for ChatKit
export type StreamEventType =
	| "message_start"
	| "content_block_start"
	| "content_block_delta"
	| "content_block_stop"
	| "message_stop"
	| "error";

export interface StreamEvent {
	type: StreamEventType;
	data: unknown;
}

export interface MessageStartEvent {
	type: "message_start";
	message: {
		id: string;
		role: "assistant";
	};
}

export interface ContentBlockDeltaEvent {
	type: "content_block_delta";
	index: number;
	delta: {
		type: "text_delta";
		text: string;
	};
}

export interface MessageStopEvent {
	type: "message_stop";
}

export interface ErrorEvent {
	type: "error";
	error: {
		message: string;
	};
}

export interface VectorSearchResult {
	id: string;
	content: string;
	score: number;
	sourceType: "document" | "text" | "qa" | "web";
	sourceTitle?: string;
	sourceId: string;
	metadata?: Record<string, unknown>;
}

// Document types
export interface DocumentDto {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	createdAt: Date;
}

export interface DocumentUploadResponse {
	id: string;
	filename: string;
	chunks: number;
	createdAt: Date;
}

export type SupportedMimeType =
	| "application/pdf"
	| "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	| "text/plain";

// Form Tool Types
export type FormFieldType =
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

export interface FormFieldValidation {
	required?: { value: boolean; message: string };
	minLength?: { value: number; message: string };
	maxLength?: { value: number; message: string };
	min?: { value: number; message: string };
	max?: { value: number; message: string };
	pattern?: { value: string; message: string };
}

export interface FormFieldOption {
	label: string;
	value: string;
}

export interface FormField {
	name: string;
	label: string;
	type: FormFieldType;
	placeholder?: string;
	defaultValue?: string; // Supports template variables: {{user.email}}, {{context.previousResult.field}}
	options?: FormFieldOption[]; // For select/multiselect
	validation?: FormFieldValidation;
}

export interface FormSchema {
	fields: FormField[];
	submitLabel?: string;
	successMessage?: string;
	errorMessage?: string;
}

export type FormExecutionMode = "webhook" | "client" | "both";

// Post-submission actions for forms
export type FormPostAction =
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
	| {
			type: "email";
			recipientIds: string[]; // User IDs (team members or owner)
			subject?: string; // Optional custom subject, defaults to "New form submission: {formName}"
	  };

export type FormSubmissionStatus =
	| "pending"
	| "submitted"
	| "webhook_success"
	| "webhook_failed"
	| "client_success"
	| "client_failed";

// Form handler types for client-side registration
export interface FormHandlerContext {
	user?: {
		id?: string;
		email?: string;
		name?: string;
		[key: string]: unknown;
	};
	previousToolResults?: Record<string, unknown>;
}

export interface FormHandlerResult {
	success: boolean;
	message?: string;
	data?: unknown;
}

export interface FormHandler {
	/** Optional: dynamically provide or override the form schema */
	getSchema?: (context: FormHandlerContext) => Promise<FormSchema> | FormSchema;
	/** Optional: prepopulate form fields with initial values */
	onInit?: (
		context: FormHandlerContext,
	) => Promise<Record<string, unknown>> | Record<string, unknown>;
	/** Required for client execution: handle form submission */
	onSubmit: (
		data: Record<string, unknown>,
		context: FormHandlerContext,
	) => Promise<FormHandlerResult> | FormHandlerResult;
}

// Form SSE event for tool_use
export interface FormToolUseEvent {
	type: "tool_use";
	tool: string;
	toolArgs?: Record<string, unknown>; // AI-generated arguments to pass to client schema function
	displayConfig: {
		type: "form";
	};
	formSchema?: FormSchema; // Optional: server-defined schema (can be overridden by client)
	formExecutionMode: FormExecutionMode;
	formClientHandler?: string;
	formPostActions?: FormPostAction[];
	initialValues?: Record<string, unknown>;
}

// User context passed to client-side form schema function
export interface FormUserContext {
	visitorId: string; // Anonymous visitor ID
	userId?: string; // If identity verification is configured
	userMetadata?: Record<string, unknown>; // Custom user metadata from ansa.identify()
	conversationId?: string;
}

// Form submission request from widget
export interface FormSubmissionRequest {
	toolId: string;
	conversationId?: string;
	formData: Record<string, unknown>;
	fieldsCompleted: string[];
	impressionAt?: number;
	startedAt?: number;
}

// Form submission outcome types
export type FormSubmissionOutcome = "conversion" | "resolution" | "none";

// Form field metadata for smart preview and display
export interface FormFieldMetadata {
	name: string;
	type: FormFieldType;
	label?: string;
}

// Form submission response from API
export interface FormSubmission {
	id: string;
	agentId: string;
	toolId: string;
	toolName: string | null;
	conversationId: string | null;
	formData: Record<string, unknown>;
	status: FormSubmissionStatus;
	webhookResponse: unknown;
	createdAt: string;
	outcome?: FormSubmissionOutcome;
	fieldMetadata?: FormFieldMetadata[];
}

// ============ Tool Block Types ============
// Used for rich tool results (products, tables, images, etc.)

export interface DisplayConfig {
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
	fieldMappings?: Record<string, string>;
	/** Path to the array in the response to iterate over (e.g. "data" or "results.items") */
	dataPath?: string;
	textFallback?: string;
	skipFollowUp?: boolean;
	followUpAcknowledgment?: string;
	options?: {
		showPrice?: boolean;
		showImage?: boolean;
		showAddToCart?: boolean;
		columns?: Array<{ key: string; label: string; width?: string }>;
		buttonStyle?: "primary" | "secondary" | "outline";
		template?: string;
		maxItems?: number;
		viewMoreUrl?: string;
		cardStyle?: "compact" | "detailed";
	};
}

export interface ToolBlockData {
	type: "tool_result";
	toolName: string;
	result: unknown;
	displayConfig: DisplayConfig;
	isError?: boolean;
	errorMessage?: string;
}

export interface ProductData {
	title?: string;
	price?: string;
	image?: string;
	url?: string;
	description?: string;
	variantId?: string;
}

export interface ButtonData {
	label: string;
	action?: string;
	url?: string;
}

// Conversions analytics types
export interface ConversionsSummary {
	conversationsWithOutcome: number;
	totalConversations: number;
	conversionRate: number; // Percentage (0-100)
	avgTimeToOutcomeSeconds: number | null;
	formSubmissions: number;
	triggerConversions: number;
	toolExecutions: number;
	previousPeriod?: {
		conversationsWithOutcome: number;
		conversionRate: number;
	};
}

export interface ConversionDailyData {
	date: string; // YYYY-MM-DD
	conversions: number;
	forms: number;
	triggers: number;
	tools: number;
	conversations: number;
	conversionRate: number;
}

export interface ConversionType {
	type: "form" | "trigger" | "tool";
	name: string;
	count: number;
	conversionRate: number;
	avgTimeToConversion: number | null;
}

export interface ConversionFunnelStep {
	step: string;
	label: string;
	count: number;
	percentage: number;
	tooltip?: string;
}

export interface ClusteredQuestion {
	clusterId: string;
	representativeQuestion: string;
	conversationCount: number;
	conversionCount: number;
	conversionRate: number; // Percentage (0-100)
	avgConfidenceScore: number | null;
	mostRecentQuestion?: string;
	highestConvertingQuestion?: string;
}

export interface ConfidenceConversionData {
	confidenceRange: string;
	label: string;
	conversionRate: number;
	conversationCount: number;
}

export interface RecentConversion {
	id: string;
	conversationId: string;
	question: string;
	actionType: "form" | "trigger" | "tool";
	actionName: string;
	timeToConversionSeconds: number;
	confidenceScore: number | null;
	createdAt: string;
}

export interface ConversionRecommendation {
	id: string;
	priority: "high" | "medium" | "low";
	title: string;
	description: string;
	actionLabel: string;
	actionUrl: string;
	impact: {
		volume: number;
		conversionRateGap: number;
		confidenceGap: number;
	};
}

// Tool Category types - for action configuration on tools
export type ToolCategory =
	| "lead_sales"
	| "support_escalation"
	| "feedback_survey"
	| "account_user"
	| "operations_internal"
	| "custom";

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
	lead_sales: "Lead & Sales",
	support_escalation: "Support Escalation",
	feedback_survey: "Feedback & Survey",
	account_user: "Account & User",
	operations_internal: "Operations & Internal",
	custom: "Custom",
};

// WebSocket types
export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

export type DeliveryStatus = "sending" | "delivered" | "failed";

export type AgentStatus = "Online" | "Away" | "Do Not Disturb";

export interface TypingEvent {
	conversationId: string;
	userId: string;
	userName?: string;
	role: "user" | "agent";
	isTyping: boolean;
}

export interface PresenceEvent {
	conversationId: string;
	viewers: Array<{
		userId: string;
		userName?: string;
		role: "user" | "agent";
	}>;
}

export interface AgentStatusChangeEvent {
	agentId: string;
	status: AgentStatus;
}

export interface MessageDeliveredEvent {
	messageId: string;
	conversationId: string;
	sequenceId: number;
	timestamp: Date;
}

export interface EscalationEvent {
	conversationId: string;
	reason?: string;
	userId?: string;
	userName?: string;
}

export interface AgentJoinEvent {
	conversationId: string;
	agentId: string;
	userName: string;
	agentStatus: AgentStatus;
}

export interface ConversationCreatedEvent {
	conversationId: string;
	agentId: string;
	title?: string;
	preview?: string;
	userId?: string;
	timestamp: Date;
}

export interface NewMessageNotification {
	conversationId: string;
	messageId: string;
	preview: string;
	timestamp: Date;
	unreadCount: number;
}

// Socket.IO event map for type safety
export interface SocketEvents {
	// Client -> Server
	"join-conversation": (data: { conversationId: string; userId?: string }) => void;
	"send-message": (data: {
		conversationId: string;
		content: string;
		role: MessageRole;
		clientId: string;
	}) => void;
	"typing-start": (data: Omit<TypingEvent, "isTyping">) => void;
	"typing-stop": (data: Omit<TypingEvent, "isTyping">) => void;
	"escalate-conversation": (data: EscalationEvent) => void;
	"agent-join": (data: Omit<AgentJoinEvent, "userName" | "agentStatus">) => void;
	"agent-viewing": (data: { conversationId: string }) => void;
	"agent-status-change": (data: AgentStatusChangeEvent) => void;
	"get-messages-since": (data: { conversationId: string; since: Date | string }) => void;

	// Server -> Client
	"message-delivered": (data: MessageDeliveredEvent) => void;
	"user-typing": (data: TypingEvent) => void;
	"agent-viewing-update": (data: PresenceEvent) => void;
	"escalation-requested": (data: EscalationEvent) => void;
	"agent-joined": (data: AgentJoinEvent) => void;
	"conversation-created": (data: ConversationCreatedEvent) => void;
	"new-message": (data: NewMessageNotification) => void;
	"messages-replay": (data: { messages: ChatMessage[] }) => void;
	"rate-limit-exceeded": (data: { retryAfter: number }) => void;

	// ChatKit protocol events (for streaming AI responses)
	message_start: (data: MessageStartEvent) => void;
	content_block_start: (data: { type: string; index: number }) => void;
	content_block_delta: (data: ContentBlockDeltaEvent) => void;
	content_block_stop: (data: { type: string; index: number }) => void;
	message_stop: (data: {
		type: "message_stop";
		conversationId?: string;
		metadata?: Record<string, unknown>;
	}) => void;
	tool_use: (data: {
		type: "tool_use";
		tool: string;
		input: unknown;
		result?: unknown;
		displayConfig?: Record<string, unknown>;
		isFormTool?: boolean;
		toolId?: string;
		formSchema?: unknown;
		formExecutionMode?: string;
		formClientHandler?: string;
		formPostActions?: unknown[];
	}) => void;
	error: (data: ErrorEvent) => void;
}

export interface SocketMetrics {
	activeConnections: number;
	totalEvents: number;
	averageLatency: number;
	reconnectionRate: number;
	errorRate: number;
	eventCounts: {
		messages: number;
		typing: number;
		escalations: number;
		agentJoins: number;
	};
}
