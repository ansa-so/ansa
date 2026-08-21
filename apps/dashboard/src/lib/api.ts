import type { ToolBlockData } from "@ansa/types";
import { getConfig as getRuntimeConfig } from "@/lib/runtime-config";
import { getGlobalSessionToken, getGlobalShop, isShopifyEmbedded } from "./shopify-context";

const API_BASE = getRuntimeConfig().apiUrl || "http://localhost:3001";

/**
 * Authenticated fetch wrapper that uses Shopify session tokens when embedded
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
	// Check if we're in Shopify embedded context
	if (isShopifyEmbedded()) {
		const headers = new Headers(options.headers);
		const token = await getGlobalSessionToken();
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
		// Always send shop domain so the API can scope by shop,
		// even when falling back to cookie auth
		const shop = getGlobalShop();
		if (shop) {
			headers.set("X-Shopify-Shop", shop);
		}
		return fetch(url, {
			...options,
			headers,
			credentials: "include",
		});
	}

	// Fallback to cookie-based auth
	return fetch(url, { ...options, credentials: "include" });
}

// ============ Config API ============

export interface AppConfig {
	selfHosted: boolean;
	widgetUrl: string;
	cdnUrl: string;
	docsUrl: string;
	apiUrl: string;
}

let cachedConfig: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
	if (cachedConfig) {
		return cachedConfig;
	}

	const response = await apiFetch(`${API_BASE}/config`, {
		credentials: "include",
	});

	if (!response.ok) {
		return {
			selfHosted: false,
			apiUrl: "http://localhost:3001",
			cdnUrl: "http://localhost:3002",
			widgetUrl: "http://localhost:3002",
			docsUrl: "http://localhost:3003",
		};
	}

	cachedConfig = await response.json();
	return cachedConfig!;
}

// ============ Documents API ============

export async function uploadDocument(agentId: string, file: File) {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("agentId", agentId);

	const response = await apiFetch(`${API_BASE}/documents`, {
		method: "POST",
		body: formData,
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Upload failed");
	}

	return response.json();
}

export async function listDocuments(agentId: string) {
	const response = await apiFetch(`${API_BASE}/documents?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch documents");
	}

	return response.json();
}

export async function deleteDocument(id: string) {
	const response = await apiFetch(`${API_BASE}/documents/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Text Sources API ============

export interface TextSource {
	id: string;
	agentId: string;
	title: string;
	content?: string;
	size?: number;
	status?: string;
	createdAt: string;
	updatedAt: string;
}

export async function createTextSource(agentId: string, title: string, content: string) {
	const response = await apiFetch(`${API_BASE}/text-sources`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, title, content }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function listTextSources(agentId: string): Promise<TextSource[]> {
	const response = await apiFetch(`${API_BASE}/text-sources?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch text sources");
	}

	return response.json();
}

export async function getTextSource(id: string): Promise<TextSource> {
	const response = await apiFetch(`${API_BASE}/text-sources/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function updateTextSource(id: string, title: string, content: string) {
	const response = await apiFetch(`${API_BASE}/text-sources/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title, content }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteTextSource(id: string) {
	const response = await apiFetch(`${API_BASE}/text-sources/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Q&A Sources API ============

export interface QaSource {
	id: string;
	agentId: string;
	questions: string[];
	answer: string;
	size?: number;
	createdAt: string;
	updatedAt: string;
}

export async function createQaSource(agentId: string, questions: string[], answer: string) {
	const response = await apiFetch(`${API_BASE}/qa-sources`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, questions, answer }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function listQaSources(agentId: string): Promise<QaSource[]> {
	const response = await apiFetch(`${API_BASE}/qa-sources?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch Q&A sources");
	}

	return response.json();
}

export async function getQaSource(id: string): Promise<QaSource> {
	const response = await apiFetch(`${API_BASE}/qa-sources/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function updateQaSource(id: string, questions: string[], answer: string) {
	const response = await apiFetch(`${API_BASE}/qa-sources/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ questions, answer }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteQaSource(id: string) {
	const response = await apiFetch(`${API_BASE}/qa-sources/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// ============ Conversations API ============

export interface ConversationMessage {
	id: string;
	conversationId: string;
	role: "user" | "assistant";
	content: string;
	createdAt: string;
	feedback?: "up" | "down" | null;
	confidenceScore?: number | null;
	isHumanResponse?: boolean | null;
	isSent?: boolean | null;
	toolBlocks?: ToolBlockData[] | null;
	metadata?: {
		messageType?: string;
		originalContent?: string;
		translatedFrom?: string;
		translatedTo?: string;
		sentByName?: string;
		sentByEmail?: string;
	} | null;
}

export interface ConversationFormSubmission {
	id: string;
	toolId: string;
	toolName: string | null;
	formData: Record<string, unknown>;
	status: string;
	createdAt: string;
}

export interface ConversationEscalation {
	id: string;
	status: string;
	priority: string;
	slaDeadline: string | null;
	slaBrokenAt: string | null;
	firstResponseAt: string | null;
	escalatedAt: string;
	escalationSource?: "user_request" | "low_confidence" | "form" | null;
}

export interface Conversation {
	id: string;
	agentId: string;
	userId?: string;
	visitorId?: string;
	title?: string;
	channel?: string;
	language?: string | null;
	status?: string;
	needsAttention?: boolean;
	resolution?: "ai_handled" | "human_handled" | "improved" | null;
	minConfidence?: number | null;
	confidenceLevel?: "high" | "medium" | "low" | null;
	hasEscalation?: boolean;
	confidenceThreshold?: number;
	escalation?: ConversationEscalation | null;
	firstHumanResponseAt?: string | null;
	assignee?: {
		id: string;
		name: string | null;
		email: string;
	} | null;
	createdAt: string;
	updatedAt: string;
	messages?: ConversationMessage[];
	suggestedMessage?: ConversationMessage | null;
	formSubmissions?: ConversationFormSubmission[];
}

export interface ConversationFilterCounts {
	thumbsUp: number;
	thumbsDown: number;
	escalated: number;
	lowConfidence: number;
}

export interface ListConversationsResponse {
	conversations: Conversation[];
	total: number;
	hasMore: boolean;
	filterCounts: ConversationFilterCounts;
}

export interface ListConversationsParams {
	agentId: string;
	filter?: "escalated" | "low-confidence";
	feedback?: "thumbs-up" | "thumbs-down";
	assigneeId?: string;
	channels?: string[];
	confidenceLevels?: string[];
	status?: string[];
	clusterId?: string;
	actionStatus?: "has_action" | "succeeded" | "failed" | "none";
	resolved?: boolean;
	hasMeaningfulQuestion?: boolean;
	hasConversion?: boolean;
	limit?: number;
	offset?: number;
}

export async function listConversations(
	params: ListConversationsParams,
): Promise<ListConversationsResponse> {
	const searchParams = new URLSearchParams({ agentId: params.agentId });
	if (params.filter) searchParams.append("filter", params.filter);
	if (params.feedback) searchParams.append("feedback", params.feedback);
	if (params.assigneeId) searchParams.append("assigneeId", params.assigneeId);
	if (params.channels && params.channels.length > 0)
		searchParams.append("channels", params.channels.join(","));
	if (params.confidenceLevels && params.confidenceLevels.length > 0)
		searchParams.append("confidenceLevels", params.confidenceLevels.join(","));
	if (params.status && params.status.length > 0)
		searchParams.append("status", params.status.join(","));
	if (params.clusterId) searchParams.append("cluster", params.clusterId);
	if (params.actionStatus) searchParams.append("actionStatus", params.actionStatus);
	if (params.resolved !== undefined) searchParams.append("resolved", params.resolved.toString());
	if (params.hasMeaningfulQuestion) searchParams.append("has_meaningful_question", "true");
	if (params.hasConversion) searchParams.append("has_conversion", "true");
	if (params.limit) searchParams.append("limit", params.limit.toString());
	if (params.offset) searchParams.append("offset", params.offset.toString());

	const response = await apiFetch(`${API_BASE}/conversations?${searchParams}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch conversations");
	}

	return response.json();
}

export interface ConversationCounts {
	escalated: number;
	lowConfidence: number;
}

export async function getConversationCounts(
	agentId?: string,
	clusterId?: string,
): Promise<ConversationCounts> {
	const params = new URLSearchParams();
	if (agentId) params.append("agentId", agentId);
	if (clusterId) params.append("cluster", clusterId);

	const url = params.toString()
		? `${API_BASE}/conversations/count?${params}`
		: `${API_BASE}/conversations/count`;
	const response = await apiFetch(url, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch conversation counts");
	}

	return response.json();
}

export async function getNewSubmissionsCount(agentId: string, since?: string): Promise<number> {
	const params = new URLSearchParams({ agentId });
	if (since) {
		params.set("since", since);
	}

	const response = await apiFetch(`${API_BASE}/leads/count/new?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		return 0;
	}

	const data = await response.json();
	return data.count ?? 0;
}

// ============ Form Submissions API ============

export interface FormSubmission {
	id: string;
	agentId: string;
	toolId: string;
	toolName: string | null;
	conversationId: string | null;
	formData: Record<string, unknown>;
	status: string;
	webhookResponse: unknown;
	createdAt: string;
	outcome?: "conversion" | "resolution" | null;
	fieldMetadata?: Array<{
		name: string;
		label?: string;
		type: string;
	}>;
	category?: string;
	countsAsConversion?: boolean;
	countsAsResolution?: boolean;
}

export async function getSubmission(id: string): Promise<FormSubmission> {
	const response = await apiFetch(`${API_BASE}/leads/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: "Not found" }));
		throw new Error(error.error || "Submission not found");
	}

	return response.json();
}

export async function getConversation(id: string): Promise<Conversation> {
	const response = await apiFetch(`${API_BASE}/conversations/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function deleteConversation(id: string) {
	const response = await apiFetch(`${API_BASE}/conversations/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

// User info response from conversation
export interface ConversationUserInfo {
	conversation: {
		id: string;
		channel: string;
		countryCode: string | null;
		language: string | null;
		pageUrl: string | null;
		pageDomain: string | null;
		pagePath: string | null;
		createdAt: string;
		firstHumanResponseAt: string | null;
		messageCount: number;
		status: string;
		internalNote: string | null;
		assignee: {
			id: string;
			name: string | null;
			email: string;
		} | null;
		needsAttention: boolean | null;
		resolution: "ai_handled" | "human_handled" | "improved" | null;
		minConfidence: number | null;
		confidenceLevel: "high" | "medium" | "low" | null;
	};
	user: {
		visitorId: string | null;
		metadata: Record<string, unknown> | null;
		email: string | null;
	};
	otherConversations: Array<{
		id: string;
		title: string | null;
		status: string;
		createdAt: string;
	}>;
	shopify: {
		customer: {
			id: string;
			email: string | null;
			firstName: string | null;
			lastName: string | null;
			phone: string | null;
			ordersCount: number | null;
			totalSpent: string | null;
			currency: string | null;
			tags: string[] | null;
			note: string | null;
			createdAt: string | null;
		};
		orders: Array<{
			id: string;
			orderNumber: string;
			financialStatus: string | null;
			fulfillmentStatus: string | null;
			totalPrice: string | null;
			currency: string | null;
			createdAt: string;
			trackingNumber: string | null;
			trackingUrl: string | null;
		}>;
	} | null;
}

export async function getConversationUserInfo(
	conversationId: string,
): Promise<ConversationUserInfo> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/user-info`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch user info");
	}

	return response.json();
}

// Update conversation status
export async function updateConversationStatus(
	conversationId: string,
	status: "open" | "pending" | "resolved" | "closed",
): Promise<{ id: string; status: string; resolvedAt: string | null }> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/status`, {
		method: "PATCH",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update conversation status");
	}

	return response.json();
}

// Mark conversation as improved (user taught AI better response)
export async function markConversationImproved(
	conversationId: string,
	messageId?: string,
): Promise<{ id: string; resolution: string; needsAttention: boolean }> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/improved`, {
		method: "PATCH",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messageId }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to mark conversation as improved");
	}

	return response.json();
}

// Update conversation internal note
export async function updateConversationNote(
	conversationId: string,
	note: string | null,
): Promise<{ id: string; internalNote: string | null }> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/note`, {
		method: "PATCH",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ note }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update conversation note");
	}

	return response.json();
}

// Assign conversation to a team member
export async function assignConversation(
	conversationId: string,
	assigneeId: string | null,
): Promise<{ id: string; assignedToId: string | null; assignedAt: string | null }> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/assign`, {
		method: "PATCH",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ assigneeId }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to assign conversation");
	}

	return response.json();
}

// Claim conversation for self
export async function claimConversation(
	conversationId: string,
): Promise<{ id: string; assignedToId: string; assignedAt: string; status: string }> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/claim`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to claim conversation");
	}

	return response.json();
}

// Reply to a conversation with a human message
export async function replyToConversation(
	conversationId: string,
	content: string,
	metadata?: {
		originalContent?: string;
		translatedFrom?: string;
		translatedTo?: string;
	},
): Promise<{
	message: {
		id: string;
		role: string;
		content: string;
		isHumanResponse: boolean;
		createdAt: string;
		metadata?: {
			originalContent?: string;
			translatedFrom?: string;
			translatedTo?: string;
		} | null;
	};
	conversationId: string;
	emailSent?: boolean;
}> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/reply`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content, metadata }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to send reply");
	}

	return response.json();
}

// Translate text for a conversation using LLM
export async function translateMessage(
	conversationId: string,
	text: string,
	targetLanguage: string,
): Promise<{
	translatedText: string;
	originalText: string;
	targetLanguage: string;
	model: string;
	usage: { inputTokens: number; outputTokens: number };
}> {
	const response = await apiFetch(`${API_BASE}/conversations/${conversationId}/translate`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text, targetLanguage }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Translation failed");
	}

	return response.json();
}

// ============ Agents API ============

export interface Agent {
	id: string;
	userId: string;
	name: string;
	slug: string;
	aiQuality: string;
	temperature: number;
	systemPrompt: string;
	persona:
		| "default"
		| "urgent"
		| "problem_solver"
		| "consultant"
		| "sales_expert"
		| "playful"
		| "inspirational"
		| "engaging"
		| "informative"
		| "professional"
		| "neutral"
		| "custom";
	isDefault: boolean;
	hasShopifyConnection?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AgentSummary extends Agent {
	stats: {
		conversations: number;
		messages: number;
		avgConfidence: number | null;
		feedbackScore: number | null;
		sourcesCount: number;
		toolsCount: number;
		triggersCount: number;
	};
}

export async function getAgentSummaries(): Promise<AgentSummary[]> {
	const response = await apiFetch(`${API_BASE}/agents/summary`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch agent summaries");
	}

	return response.json();
}

export async function listAgents(): Promise<Agent[]> {
	const response = await apiFetch(`${API_BASE}/agents`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch agents");
	}

	return response.json();
}

export async function getAgent(id: string): Promise<Agent> {
	const response = await apiFetch(`${API_BASE}/agents/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function getDefaultAgent(): Promise<Agent> {
	const response = await apiFetch(`${API_BASE}/agents/default/config`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function getSupportedModels(): Promise<string[]> {
	const response = await apiFetch(`${API_BASE}/agents/models`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch models");
	}

	return response.json();
}

export async function getPersonas(): Promise<
	Array<{
		id: string;
		name: string;
		description: string;
		systemPrompt: string;
		icon: string;
	}>
> {
	const response = await apiFetch(`${API_BASE}/agents/personas/list`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch personas");
	}

	const data = await response.json();
	return data.personas || [];
}

export async function createAgent(data: {
	name: string;
	aiQuality: string;
	temperature: number;
	systemPrompt: string;
	isDefault?: boolean;
}): Promise<Agent> {
	const response = await apiFetch(`${API_BASE}/agents`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function updateAgent(
	id: string,
	data: Partial<{
		name: string;
		aiQuality: string;
		temperature: number;
		systemPrompt: string;
		persona:
			| "default"
			| "urgent"
			| "problem_solver"
			| "consultant"
			| "sales_expert"
			| "playful"
			| "inspirational"
			| "engaging"
			| "informative"
			| "professional"
			| "neutral"
			| "custom";
		isDefault: boolean;
	}>,
): Promise<Agent> {
	const response = await apiFetch(`${API_BASE}/agents/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteAgent(id: string) {
	const response = await apiFetch(`${API_BASE}/agents/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

export interface AgentLimits {
	current: number;
	limit: number | null;
	planId: string;
	canCreate: boolean;
	billingProvider: string | null;
}

export async function getAgentLimits(): Promise<AgentLimits> {
	const response = await apiFetch(`${API_BASE}/agents/limits`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch agent limits");
	}

	return response.json();
}

// ============ Interface Settings API ============

export interface InterfaceSettings {
	id: string;
	agentId: string;
	theme: "light" | "dark" | "system";
	primaryColor: string;
	chatBubbleColor: string;
	chatBubbleAlign: "left" | "right";
	widgetButtonColor: string | null;
	widgetButtonIcon: string | null;
	widgetButtonIconType: string | null;
	widgetButtonBorderRadius: string | null;
	displayName: string;
	profilePicture: string | null;
	initialMessage: string | null;
	suggestedMessages: string[];
	messagePlaceholder: string | null;
	footerMessage: string | null;
	dismissibleMessage: string | null;
	welcomeBubbles: string[];
	collectUserFeedback: boolean;
	showSatisfactionOnResolved: boolean;
	escalationNoticeMessage: string | null;
	userEscalationMessage: string | null;
	deescalationMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export async function getInterfaceSettings(agentId: string): Promise<InterfaceSettings> {
	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch interface settings");
	}

	return response.json();
}

export async function updateInterfaceSettings(
	agentId: string,
	data: Partial<Omit<InterfaceSettings, "id" | "agentId" | "createdAt" | "updatedAt">>,
): Promise<InterfaceSettings> {
	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function uploadProfilePicture(agentId: string, file: File): Promise<{ url: string }> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}/profile-picture`, {
		method: "POST",
		body: formData,
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Upload failed");
	}

	return response.json();
}

export async function deleteProfilePicture(agentId: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}/profile-picture`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}
}

export async function uploadWidgetIcon(
	agentId: string,
	file: File,
): Promise<{ icon: string; iconType: string }> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}/widget-icon`, {
		method: "POST",
		body: formData,
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Upload failed");
	}

	return response.json();
}

export async function deleteWidgetIcon(agentId: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}/widget-icon`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}
}

// ============ Translation Management API ============

export interface SupportedLanguage {
	code: string;
	name: string;
}

export interface Translation {
	id: string;
	interfaceSettingsId: string;
	languageCode: string;
	displayName: string | null;
	initialMessage: string | null;
	suggestedMessages: string[] | null;
	messagePlaceholder: string | null;
	dismissibleMessage: string | null;
	welcomeBubbles: string[] | null;
	// Escalation translations
	positiveFeedbackPrompt: string | null;
	requestHumanPrompt: string | null;
	humanSupportConfirmation: string | null;
	escalationNoticeMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TranslationsResponse {
	translations: Translation[];
	defaultLanguage: string;
	supportedLanguages: SupportedLanguage[];
}

export async function getTranslations(agentId: string): Promise<TranslationsResponse> {
	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}/translations`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch translations");
	}

	return response.json();
}

export async function getTranslation(agentId: string, languageCode: string): Promise<Translation> {
	const response = await apiFetch(
		`${API_BASE}/interface-settings/${agentId}/translations/${languageCode}`,
		{
			credentials: "include",
		},
	);

	if (!response.ok) {
		throw new Error("Failed to fetch translation");
	}

	return response.json();
}

export async function saveTranslation(
	agentId: string,
	languageCode: string,
	data: Partial<
		Pick<
			Translation,
			| "displayName"
			| "initialMessage"
			| "suggestedMessages"
			| "messagePlaceholder"
			| "dismissibleMessage"
			| "welcomeBubbles"
			| "positiveFeedbackPrompt"
			| "requestHumanPrompt"
			| "humanSupportConfirmation"
			| "escalationNoticeMessage"
		>
	>,
): Promise<Translation> {
	const response = await apiFetch(
		`${API_BASE}/interface-settings/${agentId}/translations/${languageCode}`,
		{
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
			credentials: "include",
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Save failed");
	}

	return response.json();
}

export async function deleteTranslation(agentId: string, languageCode: string): Promise<void> {
	const response = await apiFetch(
		`${API_BASE}/interface-settings/${agentId}/translations/${languageCode}`,
		{
			method: "DELETE",
			credentials: "include",
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}
}

export async function updateDefaultLanguage(
	agentId: string,
	languageCode: string,
): Promise<{ defaultLanguage: string }> {
	const response = await apiFetch(`${API_BASE}/interface-settings/${agentId}/default-language`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ languageCode }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

// ============ Security Settings API ============

export interface SecuritySettings {
	id: string;
	agentId: string;
	messageLimit: number;
	messageLimitWindow: number;
	allowedDomains: string[];
	createdAt: string;
	updatedAt: string;
}

export async function getSecuritySettings(agentId: string): Promise<SecuritySettings> {
	const response = await apiFetch(`${API_BASE}/security-settings/${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch security settings");
	}

	return response.json();
}

export async function updateSecuritySettings(
	agentId: string,
	data: Partial<Omit<SecuritySettings, "id" | "agentId" | "createdAt" | "updatedAt">>,
): Promise<SecuritySettings> {
	const response = await apiFetch(`${API_BASE}/security-settings/${agentId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

// ============ Usage API ============

export interface UsageData {
	used: number;
	limit: number;
	remaining: number;
	planId: string;
	planName: string;
	percentUsed: number;
	billingPeriodStart: string;
	billingPeriodEnd: string;
	hasSubscription: boolean;
	hasPlanSelected: boolean;
	storageUsed: number;
	storageLimit: number;
	storagePercentUsed: number;
	billingProvider: string | null;
	cancelAtPeriodEnd: boolean;
}

export interface CanSendResult {
	allowed: boolean;
	reason?: string;
	remaining?: number;
}

export async function getUsage(): Promise<UsageData> {
	const response = await apiFetch(`${API_BASE}/usage`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch usage");
	}

	return response.json();
}

export async function canSendMessage(): Promise<CanSendResult> {
	const response = await apiFetch(`${API_BASE}/usage/can-send`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to check send permission");
	}

	return response.json();
}

// ============ Team API ============

export interface TeamMember {
	id: string;
	memberId: string;
	role: string;
	createdAt: string;
	email: string;
	name: string | null;
}

export interface TeamInvitation {
	id: string;
	token: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
	createdAt: string;
}

export interface InvitationInfo {
	id: string;
	email: string;
	role: string;
	status: string;
	expiresAt: string;
	inviterName: string | null;
	inviterEmail: string;
}

export interface TeamOwner {
	id: string;
	email: string;
	name: string | null;
}

export interface TeamContext {
	role: string;
	isOwner: boolean;
	owner: TeamOwner | null;
	members: TeamMember[];
}

export async function getTeamContext(): Promise<TeamContext> {
	const response = await apiFetch(`${API_BASE}/team/context`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch team context");
	}

	return response.json();
}

export interface EmailRecipient {
	id: string;
	email: string;
	name: string | null;
	isCurrentUser: boolean;
}

export async function getEmailRecipients(): Promise<EmailRecipient[]> {
	const response = await apiFetch(`${API_BASE}/team/email-recipients`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch email recipients");
	}

	return response.json();
}

export async function getTeamMembers(): Promise<TeamMember[]> {
	const response = await apiFetch(`${API_BASE}/team/members`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch team members");
	}

	return response.json();
}

export async function getTeamInvitations(): Promise<TeamInvitation[]> {
	const response = await apiFetch(`${API_BASE}/team/invitations`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch invitations");
	}

	return response.json();
}

export async function sendTeamInvitation(
	email: string,
	role: string = "member",
): Promise<{ invitation: TeamInvitation; inviteUrl: string; message: string }> {
	const response = await apiFetch(`${API_BASE}/team/invite`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, role }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to send invitation");
	}

	return response.json();
}

export async function cancelTeamInvitation(id: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/team/invitations/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to cancel invitation");
	}
}

export async function removeTeamMember(id: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/team/members/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to remove team member");
	}
}

export async function getInvitationInfo(token: string): Promise<InvitationInfo> {
	const response = await apiFetch(`${API_BASE}/team/invitation/${token}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Invalid invitation");
	}

	return response.json();
}

export async function acceptTeamInvitation(token: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/team/accept/${token}`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to accept invitation");
	}
}

// ============ Analytics API ============

export interface AnalyticsSummary {
	totalConversations: number;
	totalMessages: number;
	avgMessagesPerConversation: number;
	thumbsUp: number;
	thumbsDown: number;
	feedbackRatio: number;
}

export interface AnalyticsDailyData {
	date: string;
	conversations: number;
	messages: number;
	thumbsUp: number;
	thumbsDown: number;
}

export interface AnalyticsCountryData {
	countryCode: string;
	conversationCount: number;
}

export async function getAnalyticsSummary(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsSummary> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/summary?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch analytics summary");
	}

	return response.json();
}

export async function getAnalyticsDaily(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsDailyData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/daily?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch daily analytics");
	}

	return response.json();
}

export interface AnalyticsChannelData {
	channel: string;
	conversationCount: number;
}

export async function getAnalyticsChannels(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsChannelData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/channels?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch channel analytics");
	}

	return response.json();
}

export async function getAnalyticsCountries(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsCountryData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/countries?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch country analytics");
	}

	return response.json();
}

export interface AnalyticsToolData {
	toolName: string;
	executionCount: number;
	successCount: number;
	failureCount: number;
	successRate: number;
	avgExecutionTimeMs: number;
}

export async function getAnalyticsTools(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsToolData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/tools?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch tool analytics");
	}

	return response.json();
}

export interface AnalyticsPageData {
	pageDomain: string;
	pagePath: string;
	pageUrl: string;
	conversationCount: number;
}

export async function getAnalyticsPages(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsPageData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/pages?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch page analytics");
	}

	return response.json();
}

// ============ Confidence Analytics API ============

export interface ConfidenceSummary {
	avgConfidence: number | null;
	minConfidence: number | null;
	maxConfidence: number | null;
	totalWithConfidence: number;
	totalWithoutConfidence: number;
}

export interface ConfidenceDistributionData {
	range: string;
	bucket: number;
	count: number;
}

export interface ConfidenceOverTimeData {
	date: string;
	avgConfidence: number;
	messageCount: number;
}

export async function getConfidenceSummary(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<ConfidenceSummary> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/confidence?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch confidence summary");
	}

	return response.json();
}

export async function getConfidenceDistribution(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<ConfidenceDistributionData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/confidence-distribution?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch confidence distribution");
	}

	return response.json();
}

export async function getConfidenceOverTime(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<ConfidenceOverTimeData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/confidence-over-time?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch confidence over time");
	}

	return response.json();
}

// ============ Trigger Analytics API ============

export interface AnalyticsTriggerData {
	triggerId: string | null;
	triggerName: string;
	triggerType: string;
	isEnabled: boolean;
	firedCount: number;
	convertedCount: number;
	conversionRate: number;
}

export async function getAnalyticsTriggers(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnalyticsTriggerData[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/triggers?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch trigger analytics");
	}

	return response.json();
}

// ============ Response Time Analytics API ============

export interface ResponseTimeData {
	totalPairs: number;
	avgResponseTimeMs: number;
	minResponseTimeMs: number;
	maxResponseTimeMs: number;
	medianResponseTimeMs: number;
}

export async function getResponseTime(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<ResponseTimeData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/response-time?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch response time analytics");
	}

	return response.json();
}

// ============ Human Response Time Analytics API ============

export interface HumanResponseTimeData {
	responseTime: {
		totalConversations: number;
		avgResponseTimeMs: number;
		minResponseTimeMs: number;
		maxResponseTimeMs: number;
		medianResponseTimeMs: number;
	};
	slaCompliance: {
		totalEscalations: number;
		respondedCount: number;
		withinSlaCount: number;
		breachedCount: number;
		unrespondedBreachedCount: number;
		complianceRate: number;
	};
	complianceTimeSeries: Array<{
		date: string;
		complianceRate: number;
		responded: number;
		withinSla: number;
	}>;
	responseTimeDistribution: Array<{
		bucket: string;
		count: number;
	}>;
}

export async function getHumanResponseTime(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<HumanResponseTimeData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/human-response-time?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch human response time analytics");
	}

	return response.json();
}

// ============ Form Analytics API ============

export interface FormAnalyticsItem {
	toolId: string;
	toolName: string;
	impressionCount: number;
	startedCount: number;
	submissionCount: number;
	completionRate: number;
	startRate: number;
	avgCompletionTimeSeconds: number | null;
}

export interface FormAnalyticsData {
	analytics: FormAnalyticsItem[];
}

export async function getFormAnalytics(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<FormAnalyticsItem[]> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/form-submissions/analytics?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch form analytics");
	}

	const data: FormAnalyticsData = await response.json();
	return data.analytics;
}

// ============ Overview Analytics API ============

export interface OutcomesData {
	outcomeCount: number;
	conversationIds: string[];
}

export async function getAnalyticsOutcomes(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<OutcomesData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/outcomes?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch outcomes");
	}

	return response.json();
}

// ============ Conversions Analytics API ============

export interface ConfidenceConversionBucket {
	count: number;
	conversions: number;
	conversionRate: number;
}

export interface ConfidenceConversionData {
	high: ConfidenceConversionBucket;
	medium: ConfidenceConversionBucket;
	low: ConfidenceConversionBucket;
}

export async function getConversionsSummary(agentId: string, startDate?: string, endDate?: string) {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/conversions/summary?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch conversions summary");
	}

	return response.json();
}

export async function getConversionsDaily(agentId: string, startDate?: string, endDate?: string) {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/conversions/daily?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch daily conversions");
	}

	return response.json();
}

export async function getConversionsQuestions(
	agentId: string,
	startDate?: string,
	endDate?: string,
) {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/conversions/questions?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch conversion questions");
	}

	return response.json();
}

export async function getConversionsRecommendations(
	agentId: string,
	startDate?: string,
	endDate?: string,
) {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/conversions/recommendations?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch conversion recommendations");
	}

	return response.json();
}

export async function getConversionsConfidence(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<ConfidenceConversionData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/conversions/confidence?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch confidence conversion data");
	}

	return response.json();
}

export interface ResolvedQuestionsData {
	resolvedCount: number;
}

export async function getAnalyticsResolvedQuestions(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<ResolvedQuestionsData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/resolved-questions?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch resolved questions");
	}

	return response.json();
}

export interface TopQuestion {
	content: string;
	count: number;
}

export interface TopQuestionsData {
	questions: TopQuestion[];
}

export async function getAnalyticsTopQuestions(
	agentId: string,
	startDate?: string,
	endDate?: string,
	limit?: number,
	clusterId?: string,
): Promise<TopQuestionsData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);
	if (limit) params.append("limit", limit.toString());
	if (clusterId) params.append("clusterId", clusterId);

	const response = await apiFetch(`${API_BASE}/analytics/top-questions?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch top questions");
	}

	return response.json();
}

export interface LowConfidenceData {
	lowConfidenceCount: number;
	conversationIds: string[];
}

export interface ClusterInfo {
	id: string;
	agentId: string;
	representativeQuestion: string;
	conversationCount: number;
	clusterDate: Date;
}

export interface ClusterConfidenceData {
	clusterId: string;
	volume: number;
	avgConfidence: number | null;
	lowConfidenceCount: number;
	conversationIds: string[];
	confidenceThreshold?: number;
}

export async function getClusterInfo(clusterId: string): Promise<ClusterInfo> {
	const response = await apiFetch(`${API_BASE}/analytics/clusters/${clusterId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch cluster info");
	}

	return response.json();
}

export async function getClusterConfidence(
	clusterId: string,
	startDate?: string,
	endDate?: string,
): Promise<ClusterConfidenceData> {
	const params = new URLSearchParams();
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(
		`${API_BASE}/analytics/clusters/${clusterId}/confidence?${params}`,
		{
			credentials: "include",
		},
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch cluster confidence data");
	}

	return response.json();
}

export async function getAnalyticsLowConfidence(
	agentId: string,
	startDate?: string,
	endDate?: string,
	clusterId?: string,
): Promise<LowConfidenceData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);
	if (clusterId) params.append("clusterId", clusterId);

	const response = await apiFetch(`${API_BASE}/analytics/low-confidence?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch low confidence data");
	}

	return response.json();
}

// ============ Answer Quality Analytics API ============

export interface AnswerQualitySummary {
	avgConfidence: number;
	previousAvgConfidence: number;
	highConfidencePercentage: number;
	previousHighConfidencePercentage: number;
	lowConfidencePercentage: number;
	previousLowConfidencePercentage: number;
	meaningfulQuestions: number;
	previousMeaningfulQuestions: number;
}

export async function getAnswerQualitySummary(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<AnswerQualitySummary> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/answer-quality/summary?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch answer quality summary");
	}

	return response.json();
}

export interface AnswerQualityDistribution {
	bucket: string;
	range: string;
	count: number;
}

export async function getAnswerQualityDistribution(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<{ distribution: AnswerQualityDistribution[] }> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/answer-quality/distribution?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch answer quality distribution");
	}

	return response.json();
}

export interface AnswerQualityCluster {
	clusterId: string;
	representativeQuestion: string;
	volume: number;
	avgConfidence: number;
	lowConfidencePercentage: number;
	status: "healthy" | "at-risk" | "poor";
}

export async function getAnswerQualityClusters(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<{ clusters: AnswerQualityCluster[] }> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/answer-quality/clusters?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch answer quality clusters");
	}

	return response.json();
}

export interface AnswerQualityHotspot {
	clusterId: string;
	representativeQuestion: string;
	volume: number;
	avgConfidence: number;
	impactScore: number;
}

export async function getAnswerQualityHotspots(
	agentId: string,
	startDate?: string,
	endDate?: string,
): Promise<{ hotspots: AnswerQualityHotspot[] }> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/analytics/answer-quality/hotspots?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch answer quality hotspots");
	}

	return response.json();
}

// ============ Unanswered Questions API ============

export interface UnansweredQuestionsSummary {
	unansweredCount: number;
	previousUnansweredCount: number;
	unansweredPercentage: number;
	previousUnansweredPercentage: number;
	meaningfulQuestions: number;
	previousMeaningfulQuestions: number;
	topCluster: {
		name: string;
		volume: number;
	} | null;
}

export interface UnansweredCluster {
	clusterId: string;
	representativeQuestion: string;
	volume: number;
	totalVolume: number;
	unansweredPercentage: number;
	lastSeen: Date;
	priority: "high" | "medium" | "low";
}

export interface RecentUnansweredQuestion {
	questionText: string;
	cluster: string;
	count: number;
	lastAskedAt: Date;
	conversationIds: string[];
}

export interface ReasonBreakdown {
	lowConfidence: number;
	noMatchingKnowledge: number;
	fallbackResponse: number;
	retrievalError: number;
}

export interface SuggestedKnowledge {
	clusterId: string;
	representativeQuestion: string;
	volume: number;
	exampleQuestions: string[];
}

export interface UnansweredQuestionsData {
	summary: UnansweredQuestionsSummary;
	clusters: UnansweredCluster[];
	recentQuestions: RecentUnansweredQuestion[];
	reasonBreakdown: ReasonBreakdown;
	suggestedKnowledge: SuggestedKnowledge[];
}

export async function getUnansweredQuestions(
	agentId: string,
	startDate?: string,
	endDate?: string,
	clusterId?: string,
): Promise<UnansweredQuestionsData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);
	if (clusterId) params.append("clusterId", clusterId);

	const response = await apiFetch(`${API_BASE}/analytics/unanswered-questions?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch unanswered questions");
	}

	return response.json();
}

// ============ Feedback API ============

export async function submitFeedback(
	messageId: string,
	feedback: "up" | "down",
	sessionId?: string,
): Promise<{ success: boolean; updated: boolean }> {
	const response = await apiFetch(`${API_BASE}/feedback`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messageId, feedback, sessionId }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to submit feedback");
	}

	return response.json();
}

// ============ Agent Tools API ============

export interface ToolInputSchema {
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
}

export interface DisplayConfig {
	type:
		| "text"
		| "product_card"
		| "product_carousel"
		| "product_grid"
		| "image"
		| "table"
		| "buttons"
		| "custom"
		| "form";
	fieldMappings?: Record<string, string>;
	dataPath?: string;
	textFallback?: string;
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
		template?: string;
	};
}

// Form field types for form tools
export interface FormFieldValidation {
	required?: { value: boolean; message: string };
	minLength?: { value: number; message: string };
	maxLength?: { value: number; message: string };
	min?: { value: number; message: string };
	max?: { value: number; message: string };
	pattern?: { value: string; message: string };
}

export interface FormField {
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
	validation?: FormFieldValidation;
}

export interface FormSchema {
	fields: FormField[];
	introText?: string;
	submitLabel?: string;
	successMessage?: string;
	errorMessage?: string;
}

export type FormPostAction =
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
	| {
			type: "email";
			recipientIds: string[];
			subject?: string;
	  };

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

export interface AgentTool {
	id: string;
	agentId: string;
	name: string;
	description: string;
	inputSchema: ToolInputSchema;
	executionType: "mock" | "http" | "form";
	httpUrl?: string | null;
	httpMethod?: string | null;
	httpHeaders?: Record<string, string> | null;
	mockResponse?: string | null;
	displayConfig?: DisplayConfig | null;
	// Form-specific fields
	formSchema?: FormSchema | null;
	formPostActions?: FormPostAction[] | null;
	isEnabled: boolean;
	// Action configuration
	allowAiSuggest: boolean;
	countsAsConversion: boolean;
	countsAsResolution: boolean;
	category: ToolCategory;
	system: boolean;
	// Integration source for auto-created tools (e.g., "shopify", "stripe")
	integrationSource?: string | null;
	integrationId?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateToolData {
	agentId: string;
	name: string;
	description: string;
	inputSchema: ToolInputSchema;
	executionType: "mock" | "http" | "form";
	httpUrl?: string | null;
	httpMethod?: string | null;
	httpHeaders?: Record<string, string> | null;
	mockResponse?: string | null;
	displayConfig?: DisplayConfig | null;
	// Form-specific fields
	formSchema?: FormSchema | null;
	formPostActions?: FormPostAction[] | null;
	isEnabled?: boolean;
	// Action configuration
	allowAiSuggest?: boolean;
	countsAsConversion?: boolean;
	countsAsResolution?: boolean;
	category?: ToolCategory;
}

export interface UpdateToolData {
	name?: string;
	description?: string;
	inputSchema?: ToolInputSchema;
	executionType?: "mock" | "http" | "form";
	httpUrl?: string | null;
	httpMethod?: string | null;
	httpHeaders?: Record<string, string> | null;
	mockResponse?: string | null;
	displayConfig?: DisplayConfig | null;
	// Form-specific fields
	formSchema?: FormSchema | null;
	formPostActions?: FormPostAction[] | null;
	isEnabled?: boolean;
	// Action configuration
	allowAiSuggest?: boolean;
	countsAsConversion?: boolean;
	countsAsResolution?: boolean;
	category?: ToolCategory;
}

export async function listTools(agentId: string): Promise<AgentTool[]> {
	const response = await apiFetch(`${API_BASE}/tools?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch tools");
	}

	return response.json();
}

export interface ToolLimits {
	current: number;
	limit: number | null;
	planId: string;
	canCreate: boolean;
}

export async function getToolLimits(agentId: string): Promise<ToolLimits> {
	const response = await apiFetch(`${API_BASE}/tools/limits?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch tool limits");
	}

	return response.json();
}

export async function getTool(id: string): Promise<AgentTool> {
	const response = await apiFetch(`${API_BASE}/tools/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Not found");
	}

	return response.json();
}

export async function createTool(data: CreateToolData): Promise<AgentTool> {
	const response = await apiFetch(`${API_BASE}/tools`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		if (error.code === "TOOL_LIMIT_REACHED") {
			throw new Error(
				`Tool limit reached (${error.current}/${error.limit}). Upgrade your plan to add more tools.`,
			);
		}
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

export async function updateTool(id: string, data: UpdateToolData): Promise<AgentTool> {
	const response = await apiFetch(`${API_BASE}/tools/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Update failed");
	}

	return response.json();
}

export async function deleteTool(id: string): Promise<{ success: boolean }> {
	const response = await apiFetch(`${API_BASE}/tools/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Delete failed");
	}

	return response.json();
}

export async function executeToolManually(
	toolId: string,
	conversationId: string,
	input: Record<string, unknown>,
	userMetadata?: Record<string, unknown>,
): Promise<{
	success: boolean;
	message?: {
		id: string;
		conversationId: string;
		role: string;
		content: string;
		toolBlocks?: ToolBlockData[] | null;
	};
	toolResult?: unknown;
	executionTimeMs: number;
	errorMessage?: string;
}> {
	const response = await apiFetch(`${API_BASE}/tools/${toolId}/execute`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ conversationId, input, userMetadata }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to execute tool");
	}

	return response.json();
}

export async function testToolHttp(config: {
	url: string;
	method: "GET" | "POST" | "PUT" | "DELETE";
	headers?: Record<string, string>;
	input?: Record<string, unknown>;
}): Promise<{
	success: boolean;
	status?: number;
	statusText?: string;
	data?: unknown;
	error?: string;
}> {
	const response = await apiFetch(`${API_BASE}/tools/test-http`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(config),
	});

	return response.json();
}

// ============ API Discovery ============

export interface DetectedParam {
	name: string;
	type: "numeric_id" | "uuid" | "slug" | "date" | "query" | "unknown";
	originalValue: string;
	placeholder: string;
	position: number;
	isQueryParam: boolean;
	defaultValue?: string;
	removed?: boolean;
	hardcoded?: boolean;
}

export interface DiscoveryResult {
	detectedParams: DetectedParam[];
	urlTemplate: string;
	sampleResponse: unknown;
	suggestedInputSchema: {
		type: "object";
		properties: Record<
			string,
			{ type: string; description: string; default?: string | number | boolean | null }
		>;
		required: string[];
	};
	suggestedDisplayConfig: {
		type: string;
		fieldMappings?: Record<string, string>;
		options?: Record<string, unknown>;
	};
	suggestedName: string;
	suggestedDescription: string;
}

export async function analyzeApiUrl(
	url: string,
	options?: { method?: "GET" | "POST"; headers?: Record<string, string> },
): Promise<DiscoveryResult> {
	const response = await apiFetch(`${API_BASE}/discovery/analyze`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url, ...options }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Analysis failed");
	}

	return response.json();
}

export async function detectApiParams(url: string): Promise<{
	params: DetectedParam[];
	urlTemplate: string;
}> {
	const response = await apiFetch(`${API_BASE}/discovery/detect-params`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Detection failed");
	}

	return response.json();
}

export async function createToolFromDiscovery(data: {
	agentId: string;
	urlTemplate: string;
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<
			string,
			{ type: string; description?: string; default?: string | number | boolean | null }
		>;
		required?: string[];
	};
	displayConfig?: {
		type: string;
		fieldMappings?: Record<string, string>;
		options?: Record<string, unknown>;
		icon?: string;
	};
}): Promise<AgentTool> {
	const response = await apiFetch(`${API_BASE}/discovery/create-tool`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Create failed");
	}

	return response.json();
}

// ============ Marketplace API ============

export interface ToolTemplate {
	id: string;
	slug: string;
	name: string;
	description: string;
	longDescription: string | null;
	category: string;
	icon: string;
	isFree: boolean;
	installCount: number;
	requiredConfig: Array<{
		key: string;
		label: string;
		type: "text" | "password" | "url";
		placeholder?: string;
		helpText?: string;
		helpUrl?: string;
	}> | null;
}

export interface ToolTemplateDetail extends ToolTemplate {
	toolName: string;
	toolDescription: string;
	inputSchema: ToolInputSchema;
	executionType: string;
	formSchema?: FormSchema;
	httpUrl: string | null;
	httpMethod: string | null;
	httpHeaders: Record<string, string> | null;
	mockResponse: string | null;
}

export async function listMarketplaceTools(): Promise<ToolTemplate[]> {
	const response = await apiFetch(`${API_BASE}/marketplace/tools`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch marketplace tools");
	}

	return response.json();
}

export async function getMarketplaceTool(slug: string): Promise<ToolTemplateDetail> {
	const response = await apiFetch(`${API_BASE}/marketplace/tools/${slug}`);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch tool");
	}

	return response.json();
}

export async function installMarketplaceTool(
	slug: string,
	agentId: string,
	config?: Record<string, string>,
): Promise<{ success: boolean; tool: AgentTool }> {
	const response = await apiFetch(`${API_BASE}/marketplace/tools/${slug}/install`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, config }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		if (error.code === "TOOL_LIMIT_REACHED") {
			throw new Error(
				`Tool limit reached (${error.current}/${error.limit}). Upgrade your plan to add more tools.`,
			);
		}
		throw new Error(error.error || "Failed to install tool");
	}

	return response.json();
}

// ============ Web Sources API ============

export interface WebSource {
	id: string;
	agentId: string;
	name: string;
	url: string;
	sourceType: "individual" | "sitemap" | "crawl";
	status: "pending" | "crawling" | "completed" | "failed";
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
	pageCount?: number;
	totalSize?: number;
}

export interface WebSourcePage {
	id: string;
	webSourceId: string;
	url: string;
	title: string | null;
	content: string | null;
	contentSize: number;
	status: "pending" | "crawling" | "completed" | "failed";
	isExcluded: boolean;
	errorMessage: string | null;
	lastCrawledAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export async function listWebSources(agentId: string): Promise<WebSource[]> {
	const response = await apiFetch(`${API_BASE}/web-sources?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch web sources");
	}

	return response.json();
}

export async function getWebSource(id: string): Promise<WebSource & { pages: WebSourcePage[] }> {
	const response = await apiFetch(`${API_BASE}/web-sources/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch web source");
	}

	return response.json();
}

export async function createWebSource(
	agentId: string,
	name: string,
	url: string,
	sourceType: "individual" | "sitemap" | "crawl",
): Promise<WebSource> {
	const response = await apiFetch(`${API_BASE}/web-sources`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, name, url, sourceType }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create web source");
	}

	return response.json();
}

export async function deleteWebSource(id: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/web-sources/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete web source");
	}
}

export async function recrawlWebSource(id: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/web-sources/${id}/recrawl`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to recrawl web source");
	}
}

export async function toggleWebSourcePageExclusion(
	sourceId: string,
	pageId: string,
	isExcluded: boolean,
): Promise<void> {
	const response = await apiFetch(`${API_BASE}/web-sources/${sourceId}/pages/${pageId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ isExcluded }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update page");
	}
}

export async function deleteWebSourcePage(sourceId: string, pageId: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/web-sources/${sourceId}/pages/${pageId}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete page");
	}
}

export async function recrawlWebSourcePage(sourceId: string, pageId: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/web-sources/${sourceId}/pages/${pageId}/recrawl`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to recrawl page");
	}
}

// ============ Shopify Integration API ============

export interface ShopifyShop {
	id: string;
	shopDomain: string;
	shopName: string | null;
	shopEmail: string | null;
	status: "active" | "inactive" | "uninstalled";
	installedAt: string;
	lastSyncAt: string | null;
	ordersCount: number | null;
	customersCount: number | null;
	productsCount: number | null;
}

export interface ShopifyShopAgent {
	id: string;
	shopId: string;
	agentId: string;
	refundAutoApproveLimit: number | null;
	createdAt: string;
}

export interface ShopifyRefundRequest {
	id: string;
	shopId: string;
	orderId: string;
	shopifyOrderId: string;
	orderName: string | null;
	conversationId: string | null;
	amount: number;
	currency: string;
	reason: string | null;
	status: "pending" | "approved" | "rejected" | "processed" | "failed";
	requestedBy: string;
	processedBy: string | null;
	processedAt: string | null;
	createdAt: string;
	// New fields for escalation and retry
	customerName: string | null;
	customerEmail: string | null;
	customerPhone: string | null;
	errorMessage: string | null;
	retryCount: number;
	lastRetryAt: string | null;
}

export async function getShopifyInstallUrl(shop: string): Promise<{ installUrl: string }> {
	const response = await apiFetch(`${API_BASE}/shopify/install?shop=${encodeURIComponent(shop)}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to get install URL");
	}

	return response.json();
}

export async function listShopifyShops(): Promise<ShopifyShop[]> {
	const response = await apiFetch(`${API_BASE}/shopify/shops`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch Shopify shops");
	}

	return response.json();
}

export async function getShopifyShop(
	shopId: string,
): Promise<ShopifyShop & { agents: ShopifyShopAgent[] }> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch shop details");
	}

	return response.json();
}

export async function linkAgentToShop(
	shopId: string,
	agentId: string,
	refundAutoApproveLimit: number | null,
): Promise<ShopifyShopAgent> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}/agents`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, refundAutoApproveLimit, isPrimary: true }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to link agent");
	}

	return response.json();
}

export async function unlinkAgentFromShop(shopId: string, agentId: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}/agents/${agentId}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to unlink agent");
	}
}

export async function updateShopAgentSettings(
	shopId: string,
	agentId: string,
	refundAutoApproveLimit: number | null,
): Promise<ShopifyShopAgent> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}/agents/${agentId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refundAutoApproveLimit }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update settings");
	}

	return response.json();
}

export async function syncShopifyShop(shopId: string): Promise<{ message: string }> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}/sync`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to sync shop");
	}

	return response.json();
}

export async function syncShopifyTools(
	shopId: string,
	force = false,
): Promise<{
	success: boolean;
	message: string;
	created: number;
	updated: number;
	skipped: number;
}> {
	const url = force
		? `${API_BASE}/shopify/shops/${shopId}/sync-tools?force=true`
		: `${API_BASE}/shopify/shops/${shopId}/sync-tools`;

	const response = await apiFetch(url, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to sync tools");
	}

	return response.json();
}

export async function installShopifyWidget(
	shopId: string,
): Promise<{ success: boolean; scriptTagId: string }> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}/install-widget`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		if (response.status === 401 && error.reconnectUrl) {
			const reconnectError = new Error(error.message || "Shopify token expired") as Error & {
				reconnectUrl: string;
			};
			reconnectError.reconnectUrl = error.reconnectUrl;
			throw reconnectError;
		}
		throw new Error(error.error || "Failed to install widget");
	}

	return response.json();
}

export async function disconnectShopifyShop(shopId: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/shopify/shops/${shopId}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to disconnect shop");
	}
}

export async function listRefundRequests(
	status?: "pending" | "approved" | "rejected" | "processed" | "failed",
): Promise<ShopifyRefundRequest[]> {
	const params = status ? `?status=${status}` : "";
	const response = await apiFetch(`${API_BASE}/shopify/refund-requests${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch refund requests");
	}

	return response.json();
}

export async function processRefundRequest(
	requestId: string,
	action: "approve" | "reject",
): Promise<ShopifyRefundRequest> {
	const endpoint =
		action === "approve"
			? `${API_BASE}/shopify/refund-requests/${requestId}/approve`
			: `${API_BASE}/shopify/refund-requests/${requestId}/reject`;

	const response = await apiFetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({}),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || `Failed to ${action} refund request`);
	}

	return response.json();
}

export async function retryRefundRequest(requestId: string): Promise<{
	success: boolean;
	message?: string;
	shopifyRefundId?: number;
	retriesRemaining?: number;
	retryAfterSeconds?: number;
}> {
	const response = await apiFetch(`${API_BASE}/shopify/refund-requests/${requestId}/retry`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.message || data.error || "Failed to retry refund request");
	}

	return data;
}

// ============ Email Channel API ============

export interface EmailChannelSettings {
	id: string;
	agentId: string;
	inboundAddress: string;
	replyAddress: string | null;
	displayName: string;
	alertContact: string | null;
	disclaimerEnabled: boolean;
	disclaimerText: string | null;
	signature: string | null;
	subjectPrefix: string | null;
	includeOriginal: boolean;
	ccAddress: string | null;
	allowedDomains: string[];
	blockedSenders: string[];
	confidenceThreshold: number | null;
	lowConfidenceAction: string | null;
	forwardToEmail: string | null;
	autoLearnEnabled: boolean;
	threadCreationMode: "always" | "subject" | "sender";
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ResendDomain {
	id: string;
	name: string;
	status: "pending" | "verified" | "failed";
	records?: Array<{
		type: string;
		name: string;
		value: string;
		status: string;
	}>;
}

export async function getEmailSettings(agentId: string): Promise<EmailChannelSettings> {
	const response = await apiFetch(`${API_BASE}/email/settings/${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch email settings");
	}

	return response.json();
}

export async function updateEmailSettings(
	agentId: string,
	settings: Partial<
		Omit<EmailChannelSettings, "id" | "agentId" | "inboundAddress" | "createdAt" | "updatedAt">
	>,
): Promise<EmailChannelSettings> {
	const response = await apiFetch(`${API_BASE}/email/settings/${agentId}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(settings),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update email settings");
	}

	return response.json();
}

export async function createEmailDomain(domain: string): Promise<ResendDomain> {
	const response = await apiFetch(`${API_BASE}/email/verify-domain`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ domain }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create domain");
	}

	return response.json();
}

export async function getEmailDomainStatus(domain: string): Promise<ResendDomain | null> {
	const response = await apiFetch(`${API_BASE}/email/verify-status/${encodeURIComponent(domain)}`, {
		credentials: "include",
	});

	if (!response.ok) {
		if (response.status === 404) {
			return null;
		}
		const error = await response.json();
		throw new Error(error.error || "Failed to check domain status");
	}

	return response.json();
}

export async function verifyEmailDomain(domainId: string): Promise<ResendDomain> {
	const response = await apiFetch(`${API_BASE}/email/verify-domain/${domainId}`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to verify domain");
	}

	return response.json();
}

// ============ Account / User Preferences API ============

export async function updateTimezone(
	timezone: string,
): Promise<{ success: boolean; timezone: string }> {
	const response = await apiFetch(`${API_BASE}/account/timezone`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ timezone }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update timezone");
	}

	return response.json();
}

export interface UserPreferences {
	recapFrequency: "none" | "daily" | "weekly";
	recapHour: number;
	recapDigestMode: boolean;
}

export async function getUserPreferences(): Promise<UserPreferences> {
	const response = await apiFetch(`${API_BASE}/user-preferences`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to get user preferences");
	}

	return response.json();
}

export async function updateUserPreferences(
	prefs: Partial<UserPreferences>,
): Promise<UserPreferences> {
	const response = await apiFetch(`${API_BASE}/user-preferences`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(prefs),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update user preferences");
	}

	return response.json();
}

// ============ Triggers API ============

export type TriggerType =
	| "time_on_page"
	| "scroll_depth"
	| "exit_intent"
	| "page_view"
	| "custom_event";
export type TriggerActionType = "open_chat" | "show_form" | "show_bubble";

export interface TriggerConditions {
	timeOnPage?: number; // seconds
	scrollDepth?: number; // percentage 0-100
	page?: string; // URL pattern (glob or regex)
	event?: string; // custom event name
	eventData?: Record<string, unknown>;
}

export interface TriggerActionConfig {
	message?: string; // message to show when opening chat or bubble
	toolId?: string; // form tool ID for show_form action
	duration?: number; // duration for bubble in seconds
}

export interface Trigger {
	id: string;
	agentId: string;
	name: string;
	description: string | null;
	triggerType: TriggerType;
	conditions: TriggerConditions;
	actionType: TriggerActionType;
	actionConfig: TriggerActionConfig;
	isEnabled: boolean;
	triggerOnce: boolean;
	priority: number;
	createdAt: string;
	updatedAt: string;
}

export interface TriggerTemplate {
	id: string;
	slug: string;
	name: string;
	description: string;
	category: string;
	icon: string;
	triggerType: TriggerType;
	conditions: TriggerConditions;
	actionType: TriggerActionType;
	actionConfig: TriggerActionConfig;
	formTemplateSlug: string | null;
	triggerOnce: boolean;
	priority: number;
	createdAt: string;
}

export interface CreateTriggerData {
	name: string;
	description?: string;
	triggerType: TriggerType;
	conditions: TriggerConditions;
	actionType: TriggerActionType;
	actionConfig: TriggerActionConfig;
	isEnabled?: boolean;
	triggerOnce?: boolean;
	priority?: number;
}

export interface UpdateTriggerData extends Partial<CreateTriggerData> {}

export async function listTriggers(agentId: string): Promise<Trigger[]> {
	const response = await apiFetch(`${API_BASE}/triggers?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch triggers");
	}

	return response.json();
}

export interface TriggerStats {
	firedCount: number;
	convertedCount: number;
}

export async function getTriggerStats(agentId: string): Promise<Record<string, TriggerStats>> {
	const response = await apiFetch(`${API_BASE}/triggers/stats?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch trigger stats");
	}

	return response.json();
}

export async function getTrigger(id: string): Promise<Trigger> {
	const response = await apiFetch(`${API_BASE}/triggers/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Trigger not found");
	}

	return response.json();
}

export async function createTrigger(agentId: string, data: CreateTriggerData): Promise<Trigger> {
	const response = await apiFetch(`${API_BASE}/triggers?agentId=${agentId}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create trigger");
	}

	return response.json();
}

export async function updateTrigger(id: string, data: UpdateTriggerData): Promise<Trigger> {
	const response = await apiFetch(`${API_BASE}/triggers/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update trigger");
	}

	return response.json();
}

export async function deleteTrigger(id: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/triggers/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete trigger");
	}
}

export async function toggleTrigger(id: string): Promise<Trigger> {
	const response = await apiFetch(`${API_BASE}/triggers/${id}/toggle`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to toggle trigger");
	}

	return response.json();
}

export async function listTriggerTemplates(): Promise<TriggerTemplate[]> {
	const response = await apiFetch(`${API_BASE}/triggers/templates`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch trigger templates");
	}

	return response.json();
}

// ============ API Keys API ============

export interface ApiKey {
	id: string;
	name: string;
	keyPrefix: string;
	lastUsedAt: string | null;
	createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
	key: string; // Full key - only returned on creation
}

export async function listApiKeys(): Promise<ApiKey[]> {
	const response = await apiFetch(`${API_BASE}/api-keys`, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch API keys");
	}

	return response.json();
}

export async function createApiKey(name: string): Promise<ApiKeyWithSecret> {
	const response = await apiFetch(`${API_BASE}/api-keys`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create API key");
	}

	return response.json();
}

export async function deleteApiKey(id: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/api-keys/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to delete API key");
	}
}

// ============ Escalations API ============

export interface Escalation {
	id: string;
	conversationId: string;
	agentId: string;
	status: "open" | "assigned" | "in_progress" | "waiting_on_customer" | "resolved";
	priority: "low" | "medium" | "high" | "urgent";
	escalationSource: "user_request" | "low_confidence" | "form";
	assignedToId: string | null;
	assignedAt: string | null;
	assignedById: string | null;
	slaDeadline: string | null;
	slaBrokenAt: string | null;
	firstResponseAt: string | null;
	resolvedAt: string | null;
	resolvedById: string | null;
	notificationSentAt: string | null;
	escalatedAt: string;
	createdAt: string;
	updatedAt: string;
	// Joined data
	conversation?: {
		id: string;
		title: string | null;
		channel: string;
	};
	agent?: {
		id: string;
		name: string;
	};
	assignee?: {
		id: string;
		name: string | null;
		email: string;
	} | null;
	lastMessage?: {
		conversationId: string;
		content: string;
		role: string;
		createdAt: string;
	} | null;
	messages?: ConversationMessage[];
}

export interface EscalationCounts {
	open: number;
	assignedToMe: number;
	slaBreached: number;
	totalActive?: number;
}

export interface ListEscalationsParams {
	status?: string;
	assigneeId?: string;
	agentId?: string;
	priority?: string;
	slaBreached?: boolean;
	limit?: number;
	offset?: number;
}

export async function listEscalations(
	params: ListEscalationsParams = {},
): Promise<{ escalations: Escalation[]; total: number }> {
	const searchParams = new URLSearchParams();
	if (params.status) searchParams.set("status", params.status);
	if (params.assigneeId) searchParams.set("assigneeId", params.assigneeId);
	if (params.agentId) searchParams.set("agentId", params.agentId);
	if (params.priority) searchParams.set("priority", params.priority);
	if (params.slaBreached) searchParams.set("slaBreached", "true");
	if (params.limit) searchParams.set("limit", params.limit.toString());
	if (params.offset) searchParams.set("offset", params.offset.toString());

	const response = await apiFetch(`${API_BASE}/escalations?${searchParams}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch escalations");
	}

	return response.json();
}

export async function getEscalation(id: string): Promise<Escalation> {
	const response = await apiFetch(`${API_BASE}/escalations/${id}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch escalation");
	}

	return response.json();
}

export async function getEscalationCounts(): Promise<EscalationCounts> {
	const response = await apiFetch(`${API_BASE}/escalations/count`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch escalation counts");
	}

	return response.json();
}

export async function assignEscalation(
	id: string,
	assigneeId: string | null,
): Promise<{ success: boolean }> {
	const response = await apiFetch(`${API_BASE}/escalations/${id}/assign`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ assigneeId }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to assign escalation");
	}

	return response.json();
}

export async function updateEscalationStatus(
	id: string,
	status: "open" | "assigned" | "in_progress" | "waiting_on_customer" | "resolved",
	resolutionNote?: string,
): Promise<{ success: boolean }> {
	const response = await apiFetch(`${API_BASE}/escalations/${id}/status`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status, resolutionNote }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update escalation status");
	}

	return response.json();
}

export async function updateEscalationPriority(
	id: string,
	priority: "low" | "medium" | "high" | "urgent",
): Promise<{ success: boolean }> {
	const response = await apiFetch(`${API_BASE}/escalations/${id}/priority`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ priority }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update escalation priority");
	}

	return response.json();
}

export interface EscalationHistoryItem {
	id: string;
	status: string;
	priority: string;
	escalationSource: string;
	escalatedAt: string;
	resolvedAt: string | null;
	resolutionNote: string | null;
	slaDeadline: string | null;
	slaBrokenAt: string | null;
	firstResponseAt: string | null;
	createdAt: string;
	escalatedBy: { id: string; name: string; email: string } | null;
	resolvedBy: { id: string; name: string; email: string } | null;
	assignedTo: { id: string; name: string; email: string } | null;
}

export async function getEscalationHistory(
	conversationId: string,
): Promise<{ history: EscalationHistoryItem[] }> {
	const response = await apiFetch(`${API_BASE}/escalations/history/${conversationId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch escalation history");
	}

	return response.json();
}

export async function createEscalation(conversationId: string, source: string): Promise<void> {
	const response = await apiFetch(`${API_BASE}/escalations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ conversationId, source }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to create escalation");
	}
}

export async function respondToEscalation(
	id: string,
	content: string,
	metadata?: {
		originalContent?: string;
		translatedFrom?: string;
		translatedTo?: string;
	},
): Promise<{ success: boolean; message: ConversationMessage; emailSent?: boolean }> {
	const response = await apiFetch(`${API_BASE}/escalations/${id}/respond`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content, metadata }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to respond to escalation");
	}

	return response.json();
}

// Escalation Settings
export interface EscalationSettings {
	agentId: string;
	enabled: boolean;
	showButtonsAfter:
		| "first_ai_response"
		| "every_ai_response"
		| "never"
		| "on_human_request"
		| "on_low_confidence"
		| "on_help_request"
		| "on_human_or_negative_feedback"
		| "on_any_signal";
	notificationMethod: "none" | "email" | "slack" | "webhook";
	notificationConfig: {
		emailAddresses?: string[];
		slackWebhookUrl?: string;
		webhookUrl?: string;
	};
	defaultPriority: "low" | "medium" | "high" | "urgent";
	defaultAssigneeId: string | null;
	slaConfig: {
		low?: number;
		medium?: number;
		high?: number;
		urgent?: number;
	};
	// Auto-close settings (in minutes)
	widgetAutoCloseMinutes?: number;
	emailAutoCloseMinutes?: number;
	// Widget AI confidence settings
	widgetConfidenceThreshold?: number;
	widgetLowConfidenceAction?: "respond" | "escalate";
}

export async function getEscalationSettings(agentId: string): Promise<EscalationSettings> {
	const response = await apiFetch(`${API_BASE}/escalations/settings/${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch escalation settings");
	}

	return response.json();
}

export async function updateEscalationSettings(
	agentId: string,
	settings: Partial<Omit<EscalationSettings, "agentId">>,
): Promise<EscalationSettings> {
	const response = await apiFetch(`${API_BASE}/escalations/settings/${agentId}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(settings),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update escalation settings");
	}

	return response.json();
}

// ============ Resolutions API ============

export interface ResolutionsData {
	kpis: {
		resolvedCount: number;
		previousResolvedCount: number;
		resolutionRate: number; // 0-100
		previousResolutionRate: number;
		avgTimeToResolution: number; // seconds
		previousAvgTimeToResolution: number;
	};
	funnelSteps: {
		meaningfulQuestions: number;
		actionAttempted: number;
		actionSucceeded: number;
		resolved: number;
	};
	clusterBreakdown: Array<{
		clusterId: string | null;
		label: string;
		volume: number;
		resolutionRate: number; // 0-100
		status: "healthy" | "ok" | "at-risk";
		actions: Array<{
			actionId: string;
			actionName: string;
			executionCount: number;
			successRate: number; // 0-100
		}>;
	}>;
	unresolvedReasons: {
		lowConfidence: number;
		noActionSucceeded: number;
		userFollowUp: number;
		escalated: number;
	};
	confidenceBreakdown: Array<{
		range: "high" | "medium" | "low";
		label: string;
		resolutionRate: number; // 0-100
		count: number;
	}>;
	recentlyResolved: Array<{
		conversationId: string;
		turnId: string;
		questionText: string;
		actionName: string | null;
		timeToResolution: number; // seconds
		confidenceScore: number | null;
		timestamp: string;
	}>;
	topRecommendation: {
		type: "add_knowledge" | "improve_answers" | "fix_actions";
		title: string;
		description: string;
		ctaText: string;
		ctaHref: string;
		clusterId?: string;
	} | null;
}

export async function getResolutionsData(
	agentId: string,
	startDate?: string,
	endDate?: string,
	followUpWindowMinutes?: number,
): Promise<ResolutionsData> {
	const params = new URLSearchParams({ agentId });
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);
	if (followUpWindowMinutes)
		params.append("followUpWindowMinutes", followUpWindowMinutes.toString());

	const response = await apiFetch(`${API_BASE}/analytics/resolutions?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch resolutions data");
	}

	return response.json();
}

// ============ Admin API ============

export interface AdminCheckResponse {
	isAdmin: boolean;
	role: string | null;
}

export interface AdminKPIs {
	dateRange: {
		start: string;
		end: string;
	};
	users: {
		total: number;
		newInPeriod: number;
		daily: Array<{ date: string; count: number }>;
	};
	subscriptions: {
		byPlan: Array<{ planId: string; count: number }>;
		mrr: number;
		byProvider: Array<{ provider: string; count: number }>;
		totalPaying: number;
	};
	conversations: {
		total: number;
		inPeriod: number;
		messagesInPeriod: number;
		daily: Array<{ date: string; count: number }>;
		byChannel: Array<{ channel: string; count: number }>;
	};
	llm: {
		totalCostCents: number;
		totalInputTokens: number;
		totalOutputTokens: number;
		totalCalls: number;
		byTier: Array<{ tier: string; costCents: number; calls: number }>;
		byModel: Array<{
			model: string;
			costCents: number;
			inputTokens: number;
			outputTokens: number;
			calls: number;
		}>;
		daily: Array<{ date: string; costCents: number; calls: number }>;
		dailyByTier: Array<{ date: string; balanced: number; high_quality: number }>;
	};
}

export interface TopAgent {
	id: string;
	name: string;
	ownerEmail: string;
	conversationCount: number;
}

export interface RecentAccount {
	id: string;
	email: string;
	name: string | null;
	createdAt: string | null;
	plan: string;
}

export async function getRecentAccounts(limit?: number): Promise<{ accounts: RecentAccount[] }> {
	const params = new URLSearchParams();
	if (limit) params.append("limit", limit.toString());

	const response = await apiFetch(`${API_BASE}/admin/recent-accounts?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch recent accounts");
	}

	return response.json();
}

export async function checkAdminAccess(): Promise<AdminCheckResponse> {
	const response = await apiFetch(`${API_BASE}/admin/check`, {
		credentials: "include",
	});

	if (!response.ok) {
		return { isAdmin: false, role: null };
	}

	return response.json();
}

export async function getAdminKPIs(startDate?: string, endDate?: string): Promise<AdminKPIs> {
	const params = new URLSearchParams();
	if (startDate) params.append("startDate", startDate);
	if (endDate) params.append("endDate", endDate);

	const response = await apiFetch(`${API_BASE}/admin/kpis?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch admin KPIs");
	}

	return response.json();
}

export async function getTopAgents(limit?: number): Promise<{ agents: TopAgent[] }> {
	const params = new URLSearchParams();
	if (limit) params.append("limit", limit.toString());

	const response = await apiFetch(`${API_BASE}/admin/top-agents?${params}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch top agents");
	}

	return response.json();
}

// ============ Messenger Channel API ============

export interface MessengerChannelSettings {
	id: string;
	agentId: string;
	enabled: boolean;
	confidenceThreshold: number | null;
	lowConfidenceAction: string | null;
	forwardToEmail: string | null;
}

export interface MessengerPage {
	id: string;
	facebookPageId: string;
	pageName: string;
	enabled: boolean;
	webhookVerifyToken: string;
	createdAt: string;
}

export async function getMessengerSettings(agentId: string): Promise<MessengerChannelSettings> {
	const response = await apiFetch(`${API_BASE}/messenger/settings?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch messenger settings");
	}

	return response.json();
}

export async function updateMessengerSettings(
	agentId: string,
	settings: Partial<Omit<MessengerChannelSettings, "id" | "agentId">>,
): Promise<{ success: boolean }> {
	const response = await apiFetch(`${API_BASE}/messenger/settings`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, ...settings }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to update messenger settings");
	}

	return response.json();
}

export async function getMessengerPages(agentId: string): Promise<{ pages: MessengerPage[] }> {
	const response = await apiFetch(`${API_BASE}/messenger/pages?agentId=${agentId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch messenger pages");
	}

	return response.json();
}

export async function connectMessengerPages(
	agentId: string,
	pages: Array<{ id: string; name: string; accessToken: string }>,
): Promise<{ success: boolean; pages: MessengerPage[] }> {
	const response = await apiFetch(`${API_BASE}/messenger/pages`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ agentId, pages }),
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to connect messenger pages");
	}

	return response.json();
}

export async function disconnectMessengerPage(pageId: string): Promise<{ success: boolean }> {
	const response = await apiFetch(`${API_BASE}/messenger/pages/${pageId}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to disconnect messenger page");
	}

	return response.json();
}

export async function getMessengerWebhookInfo(
	pageId: string,
): Promise<{ webhookUrl: string; verifyToken: string }> {
	const response = await apiFetch(`${API_BASE}/messenger/webhook-info/${pageId}`, {
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to fetch webhook info");
	}

	return response.json();
}
